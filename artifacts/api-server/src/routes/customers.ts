import { Router } from "express";
import { db, syncCustomerAccounts, syncSupplierAccounts } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

// ==========================================
// 1. OFFICES & AGENCIES LIST (المكاتب والوكالات)
// ==========================================
router.get("/travel/offices", (req, res) => {
  const offices = db.prepare(`SELECT * FROM travel_partner_offices WHERE active = 1 ORDER BY id ASC`).all();
  res.json(offices);
});

router.post("/travel/offices", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const { name, name_en, office_type, city, phone, email, contact_person, notes } = req.body;
  if (!name || !name.trim()) { res.status(400).json({ error: "اسم المكتب أو الوكالة مطلوب" }); return; }

  const cleanName = name.trim();

  // Create account in Chart of Accounts under 11200 (الذمم المدينة - مكاتب ووكلاء وشركاء)
  const getNextSubCode = () => {
    const rows = db.prepare("SELECT code FROM accounts WHERE code LIKE '112%' AND code != '11200'").all() as { code: string }[];
    let maxNum = 11200;
    for (const r of rows) {
      const num = parseInt(r.code, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    let cand = maxNum + 1;
    while (db.prepare("SELECT id FROM accounts WHERE code = ?").get(String(cand))) {
      cand++;
    }
    return String(cand);
  };

  const accountCode = getNextSubCode();
  try {
    db.prepare(`
      INSERT INTO accounts (code, name, type, parent_code, balance, active, is_parent, auto_add, level)
      VALUES (?, ?, 'asset', '11200', 0, 1, 0, 1, 3)
    `).run(accountCode, cleanName);
  } catch (err) {
    console.error("Error creating account for office in chart of accounts:", err);
  }

  const stmt = db.prepare(`
    INSERT INTO travel_partner_offices (name, name_en, office_type, city, phone, email, contact_person, notes, account_code, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const r = stmt.run(
    cleanName, name_en || null, office_type || 'partner_agency', city || null, phone || null, email || null,
    contact_person || null, notes || null, accountCode
  );
  try { syncSupplierAccounts(); } catch {}
  const newOffice = db.prepare("SELECT * FROM travel_partner_offices WHERE id = ?").get(r.lastInsertRowid);
  res.status(201).json(newOffice);
});

// ==========================================
// 2. CUSTOMERS (العملاء مع التبعية للمكتب)
// ==========================================
router.get("/customers", (req, res) => {
  const { type, search, affiliation_type, office_id } = req.query;
  let sql = `
    SELECT c.*, c.created_at as createdAt,
           CASE 
             WHEN c.affiliation_type = 'agency' THEN 0 
             ELSE COALESCE(SUM(o.total), 0) + COALESCE((SELECT SUM(selling_price) FROM travel_bookings WHERE customer_id = c.id), 0) 
           END as totalPurchases,
           (SELECT COUNT(*) FROM travel_passengers WHERE customer_id = c.id) as passengersCount,
           (SELECT COUNT(*) FROM travel_bookings WHERE customer_id = c.id) as bookingsCount
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (type) {
    sql += ` AND c.customer_type = ?`;
    params.push(type);
  }
  if (affiliation_type) {
    sql += ` AND c.affiliation_type = ?`;
    params.push(affiliation_type);
  }
  if (office_id) {
    sql += ` AND c.office_id = ?`;
    params.push(office_id);
  }
  if (search) {
    sql += ` AND (c.name LIKE ? OR c.name_en LIKE ? OR c.phone LIKE ? OR c.customer_number LIKE ? OR c.passport_number LIKE ? OR c.national_id LIKE ? OR c.office_name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s, s);
  }

  sql += ` GROUP BY c.id ORDER BY c.id DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.post("/customers", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    customer_number, name, name_en, phone, alternate_phone, email, address, nationality, country,
    dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
    employer, notes, customer_type,
    affiliation_type, office_id, office_name, office_phone, account_code
  } = req.body;

  if (!name) { res.status(400).json({ error: "اسم العميل مطلوب" }); return; }

  const custNum = customer_number?.trim() || `CUST-${Date.now().toString().slice(-5)}`;
  const affType = affiliation_type || 'direct';

  let finalAccountCode = account_code || null;
  let finalOfficeId = office_id ? Number(office_id) : null;
  let finalOfficeName = office_name || null;

  const isAgencyAffiliated = affType === 'agency' || 
                             affType === 'indirect' || 
                             customer_type === 'indirect' || 
                             customer_type === 'agent_customer' || 
                             customer_type === 'sub_customer' || 
                             (finalOfficeId != null && finalOfficeId > 0) || 
                             (finalOfficeName && finalOfficeName.trim() !== '' && !finalOfficeName.includes('الرئيسي'));

  if (isAgencyAffiliated) {
    if (finalOfficeId) {
      const office = db.prepare("SELECT id, name, account_code FROM travel_partner_offices WHERE id = ?").get(finalOfficeId) as any;
      if (office) {
        finalOfficeName = office.name;
        finalAccountCode = office.account_code || getPartnerOfficeAccountCode(finalOfficeId) || "11200";
      }
    } else if (finalAccountCode) {
      const matchedOff = db.prepare("SELECT id, name FROM travel_partner_offices WHERE account_code = ?").get(finalAccountCode) as any;
      if (matchedOff) {
        finalOfficeId = matchedOff.id;
        finalOfficeName = matchedOff.name;
      } else {
        const accInfo = db.prepare("SELECT name FROM accounts WHERE code = ?").get(finalAccountCode) as any;
        if (accInfo) {
          finalOfficeName = accInfo.name;
        }
      }
    } else if (finalOfficeName) {
      const matchedOff = db.prepare("SELECT id, name, account_code FROM travel_partner_offices WHERE name = ?").get(finalOfficeName) as any;
      if (matchedOff) {
        finalOfficeId = matchedOff.id;
        finalAccountCode = matchedOff.account_code || getPartnerOfficeAccountCode(matchedOff.id) || "11200";
      } else {
        finalAccountCode = "11200";
      }
    } else {
      finalAccountCode = "11200";
    }

    // SECURITY & ACCOUNTING INTEGRITY ENFORCEMENT:
    // Strictly prevent and purge any individual account in `accounts` table for this sub-customer
    try {
      const rogueAccounts = db.prepare("SELECT code FROM accounts WHERE TRIM(name) = ?").all(name.trim()) as any[];
      for (const rogue of rogueAccounts) {
        if (rogue.code !== finalAccountCode) {
          db.prepare("UPDATE journal_entry_lines SET account_code = ? WHERE account_code = ?").run(finalAccountCode, rogue.code);
          db.prepare("DELETE FROM accounts WHERE code = ?").run(rogue.code);
        }
      }
      db.prepare("DELETE FROM account_customers WHERE customer_id IN (SELECT id FROM customers WHERE TRIM(name) = ?)").run(name.trim());
    } catch (cleanErr) {
      console.error("Cleanup rogue account error:", cleanErr);
    }
  }

  const stmt = db.prepare(`
    INSERT INTO customers (
      customer_number, name, name_en, phone, alternate_phone, email, address, nationality, country,
      dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
      employer, notes, customer_type,
      affiliation_type, office_id, office_name, office_phone, account_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const r = stmt.run(
    custNum, name, name_en || null, phone || null, alternate_phone || null, email || null, address || null,
    nationality || null, country || null, dob || null, gender || null, national_id || null,
    passport_number || null, passport_issue_date || null, passport_expiry_date || null,
    employer || null, notes || null, customer_type || 'individual',
    affType, finalOfficeId, finalOfficeName, office_phone || null, finalAccountCode
  );

  const cust = db.prepare("SELECT *, 0 as totalPurchases, created_at as createdAt FROM customers WHERE id=?").get(r.lastInsertRowid);
  try { syncCustomerAccounts(); } catch {}
  res.status(201).json(cust);
});

router.put("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    customer_number, name, name_en, phone, alternate_phone, email, address, nationality, country,
    dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
    employer, notes, customer_type,
    affiliation_type, office_id, office_name, office_phone, account_code
  } = req.body;

  const affType = affiliation_type || 'direct';
  let finalAccountCode = account_code || null;
  let finalOfficeId = office_id ? Number(office_id) : null;
  let finalOfficeName = office_name || null;

  const isAgencyAffiliated = affType === 'agency' || 
                             affType === 'indirect' || 
                             customer_type === 'indirect' || 
                             customer_type === 'agent_customer' || 
                             customer_type === 'sub_customer' || 
                             (finalOfficeId != null && finalOfficeId > 0) || 
                             (finalOfficeName && finalOfficeName.trim() !== '' && !finalOfficeName.includes('الرئيسي'));

  if (isAgencyAffiliated) {
    if (finalOfficeId) {
      const office = db.prepare("SELECT id, name, account_code FROM travel_partner_offices WHERE id = ?").get(finalOfficeId) as any;
      if (office) {
        finalOfficeName = office.name;
        finalAccountCode = office.account_code || getPartnerOfficeAccountCode(finalOfficeId) || "11200";
      }
    } else if (finalAccountCode) {
      const matchedOff = db.prepare("SELECT id, name FROM travel_partner_offices WHERE account_code = ?").get(finalAccountCode) as any;
      if (matchedOff) {
        finalOfficeId = matchedOff.id;
        finalOfficeName = matchedOff.name;
      }
    } else if (finalOfficeName) {
      const matchedOff = db.prepare("SELECT id, name, account_code FROM travel_partner_offices WHERE name = ?").get(finalOfficeName) as any;
      if (matchedOff) {
        finalOfficeId = matchedOff.id;
        finalAccountCode = matchedOff.account_code || getPartnerOfficeAccountCode(matchedOff.id) || "11200";
      } else {
        finalAccountCode = "11200";
      }
    } else {
      finalAccountCode = "11200";
    }

    // SECURITY & ACCOUNTING INTEGRITY ENFORCEMENT:
    // Strictly prevent and purge any individual account in `accounts` table for this sub-customer
    try {
      const prevCust = db.prepare("SELECT account_code, name FROM customers WHERE id = ?").get(req.params.id) as any;
      if (prevCust && prevCust.account_code && prevCust.account_code !== finalAccountCode) {
        db.prepare("UPDATE journal_entry_lines SET account_code = ? WHERE account_code = ?").run(finalAccountCode, prevCust.account_code);
        db.prepare("DELETE FROM accounts WHERE code = ?").run(prevCust.account_code);
      }
      const rogueAccounts = db.prepare("SELECT code FROM accounts WHERE TRIM(name) = ?").all(name.trim()) as any[];
      for (const rogue of rogueAccounts) {
        if (rogue.code !== finalAccountCode) {
          db.prepare("UPDATE journal_entry_lines SET account_code = ? WHERE account_code = ?").run(finalAccountCode, rogue.code);
          db.prepare("DELETE FROM accounts WHERE code = ?").run(rogue.code);
        }
      }
      db.prepare("DELETE FROM account_customers WHERE customer_id = ?").run(req.params.id);
    } catch (cleanErr) {
      console.error("Cleanup rogue account error in PUT:", cleanErr);
    }
  }

  db.prepare(`
    UPDATE customers SET
      customer_number=?, name=?, name_en=?, phone=?, alternate_phone=?, email=?, address=?, nationality=?, country=?,
      dob=?, gender=?, national_id=?, passport_number=?, passport_issue_date=?, passport_expiry_date=?,
      employer=?, notes=?, customer_type=?,
      affiliation_type=?, office_id=?, office_name=?, office_phone=?, account_code=?
    WHERE id=?
  `).run(
    customer_number || null, name, name_en || null, phone || null, alternate_phone || null, email || null, address || null,
    nationality || null, country || null, dob || null, gender || null, national_id || null,
    passport_number || null, passport_issue_date || null, passport_expiry_date || null,
    employer || null, notes || null, customer_type || 'individual',
    affType, finalOfficeId, finalOfficeName, office_phone || null, finalAccountCode,
    req.params.id
  );

  try { syncCustomerAccounts(); } catch {}
  const cust = db.prepare(`SELECT c.*, c.created_at as createdAt FROM customers c WHERE c.id=?`).get(req.params.id);
  res.json(cust);
});

router.delete("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  res.status(204).send();
});

export function getPartnerOfficeAccountCode(officeId: any): string {
  if (!officeId) return "11200";
  try {
    const getNextSubCode112 = () => {
      const rows = db.prepare("SELECT code FROM accounts WHERE code LIKE '112%' AND code != '11200'").all() as { code: string }[];
      let maxNum = 11200;
      for (const r of rows) {
        const num = parseInt(r.code, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      return String(maxNum + 1);
    };

    const createPartnerOfficeAccount = (name: string): string => {
      const existing = db.prepare("SELECT code FROM accounts WHERE parent_code = '11200' AND name = ?").get(name) as any;
      if (existing?.code) return existing.code;
      const code = getNextSubCode112();
      db.prepare(`
        INSERT INTO accounts (code, name, type, parent_code, balance, active, is_parent, auto_add, level)
        VALUES (?, ?, 'asset', '11200', 0, 1, 0, 1, 3)
      `).run(code, name);
      return code;
    };

    const po = db.prepare("SELECT id, account_code, name FROM travel_partner_offices WHERE id = ? OR name = ?").get(officeId, String(officeId)) as any;
    if (po) {
      if (po.account_code) {
        const acc = db.prepare("SELECT code, type, parent_code FROM accounts WHERE code = ?").get(po.account_code) as any;
        if (acc && acc.parent_code === '11200') {
          return po.account_code;
        }
      }
      const poName = po.name || `مكتب وسيط #${po.id}`;
      const code = createPartnerOfficeAccount(poName);
      db.prepare("UPDATE travel_partner_offices SET account_code = ? WHERE id = ?").run(code, po.id);
      return code;
    }
  } catch (e) {
    console.error("Error in getPartnerOfficeAccountCode:", e);
  }
  return "11200";
}

export function getCustomerAccountCode(customerId: any): string {
  if (!customerId) return "11200";
  try {
    let cust = db.prepare("SELECT id, account_code, name, affiliation_type, office_id FROM customers WHERE id = ? OR name = ?").get(customerId, String(customerId)) as any;
    
    // If not found in customers, check if customerId is a passenger in travel_passengers
    if (!cust) {
      const pax = db.prepare("SELECT customer_id FROM travel_passengers WHERE id = ?").get(customerId) as any;
      if (pax && pax.customer_id) {
        cust = db.prepare("SELECT id, account_code, name, affiliation_type, office_id FROM customers WHERE id = ?").get(pax.customer_id) as any;
      }
    }

    if (cust) {
      // RULE: Customers belonging to an agency/intermediary office must post to the office's account under 11200 (ذمم مدينة)!
      // STRICTLY FORBIDDEN to create a separate independent account for agency affiliated / indirect customers.
      const isIndirect = cust.affiliation_type === 'agency' || 
                         cust.affiliation_type === 'indirect' || 
                         cust.customer_type === 'indirect' || 
                         cust.customer_type === 'agent_customer' || 
                         cust.customer_type === 'sub_customer' || 
                         (cust.office_id != null && Number(cust.office_id) > 0) || 
                         (cust.partner_office_id != null && Number(cust.partner_office_id) > 0) || 
                         (cust.office_name && String(cust.office_name).trim() !== '' && !String(cust.office_name).includes('الرئيسي'));

      if (isIndirect) {
        const offId = cust.office_id || cust.partner_office_id;
        if (offId) {
          const officeCode = getPartnerOfficeAccountCode(offId);
          if (officeCode) {
            if (cust.account_code !== officeCode) {
              db.prepare("UPDATE customers SET account_code = ? WHERE id = ?").run(officeCode, cust.id);
            }
            return officeCode;
          }
        }
        if (cust.office_name) {
          const offByName = db.prepare("SELECT id, account_code FROM travel_partner_offices WHERE name = ?").get(cust.office_name) as any;
          if (offByName) {
            const officeCode = offByName.account_code || getPartnerOfficeAccountCode(offByName.id);
            if (officeCode) {
              if (cust.account_code !== officeCode) {
                db.prepare("UPDATE customers SET account_code = ? WHERE id = ?").run(officeCode, cust.id);
              }
              return officeCode;
            }
          }
        }
        if (cust.account_code && cust.account_code.startsWith("112")) return cust.account_code;
        return "11200"; // Default partner agency account
      }

      // Direct customers
      if (cust.account_code) {
        const existsAcc = db.prepare("SELECT code FROM accounts WHERE code = ?").get(cust.account_code);
        if (existsAcc) return cust.account_code;
      }

      // Helper to calculate the next sub-account code under '11200'
      const getNextSubCode = () => {
        const rows = db.prepare("SELECT code FROM accounts WHERE code LIKE '112%' AND code != '11200'").all() as { code: string }[];
        let maxNum = 11200;
        for (const r of rows) {
          const num = parseInt(r.code, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
        return String(maxNum + 1);
      };

      // Helper to insert a new account in chart of accounts under '11200' for DIRECT customers only
      const createAccount = (name: string): string => {
        const code = getNextSubCode();
        db.prepare(`
          INSERT INTO accounts (code, name, type, parent_code, balance, active, is_parent, auto_add, level)
          VALUES (?, ?, 'asset', '11200', 0, 1, 0, 1, 3)
        `).run(code, name);
        return code;
      };

      const custName = cust.name || `عميل #${cust.id}`;
      const code = createAccount(custName);
      db.prepare("UPDATE customers SET account_code = ? WHERE id = ?").run(code, cust.id);
      return code;
    }
    const acc = db.prepare("SELECT code FROM accounts WHERE code = ? OR id = ? OR name = ?").get(String(customerId), customerId, String(customerId)) as any;
    if (acc && acc.code) return acc.code;
  } catch (e) {
    console.error("Error in getCustomerAccountCode:", e);
  }
  return "11200";
}

export function getSupplierAccountCode(supplierId: any): string {
  if (!supplierId) return "21100";
  try {
    // If supplierId is a partner office, redirect to 11200 (ذمم مدينة)
    const po = db.prepare("SELECT id, account_code, name FROM travel_partner_offices WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
    if (po) {
      return getPartnerOfficeAccountCode(po.id);
    }

    // Helper to calculate the next sub-account code under '21100'
    const getNextSubCode = () => {
      const rows = db.prepare("SELECT code FROM accounts WHERE code LIKE '211%' AND code != '21100'").all() as { code: string }[];
      let maxNum = 21100;
      for (const r of rows) {
        const num = parseInt(r.code, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
      return String(maxNum + 1);
    };

    // Helper to insert a new account in chart of accounts under '21100'
    const createAccount = (name: string): string => {
      const code = getNextSubCode();
      db.prepare(`
        INSERT INTO accounts (code, name, type, parent_code, balance, active, is_parent, auto_add, level)
        VALUES (?, ?, 'liability', '21100', 0, 1, 0, 1, 3)
      `).run(code, name);
      return code;
    };

    // 1. If supplierId is already an account code format (e.g. 4+ digits)
    if (typeof supplierId === "string" && supplierId.length >= 4 && /^\d+$/.test(supplierId)) {
      const directCode = db.prepare("SELECT code FROM accounts WHERE code = ?").get(supplierId) as any;
      if (directCode?.code) return directCode.code;
    }

    // 2. Specific supplier tables lookup FIRST by ID or name
    const tc = db.prepare("SELECT id, account_code, name, name as company_name FROM travel_transport_companies WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
    if (tc) {
      if (tc.account_code) return tc.account_code;
      const tcName = tc.company_name || tc.name || `شركة نقل بري #${tc.id}`;
      const code = createAccount(tcName);
      db.prepare("UPDATE travel_transport_companies SET account_code = ? WHERE id = ?").run(code, tc.id);
      return code;
    }

    const ts = db.prepare("SELECT id, account_code, name FROM travel_suppliers WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
    if (ts) {
      if (ts.account_code) return ts.account_code;
      const tsName = ts.name || `مورد سفر #${ts.id}`;
      const code = createAccount(tsName);
      db.prepare("UPDATE travel_suppliers SET account_code = ? WHERE id = ?").run(code, ts.id);
      return code;
    }

    const sup = db.prepare("SELECT id, account_code, name FROM suppliers WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
    if (sup) {
      if (sup.account_code) return sup.account_code;
      const sName = sup.name || `مورد #${sup.id}`;
      const code = createAccount(sName);
      db.prepare("UPDATE suppliers SET account_code = ? WHERE id = ?").run(code, sup.id);
      return code;
    }

    const h = db.prepare("SELECT id, account_code, name_ar, name_en FROM travel_hotels_db WHERE id = ? OR name_ar = ? OR name_en = ?").get(supplierId, String(supplierId), String(supplierId)) as any;
    if (h) {
      if (h.account_code) return h.account_code;
      const hName = h.name_ar || h.name_en || `فندق #${h.id}`;
      const code = createAccount(hName);
      db.prepare("UPDATE travel_hotels_db SET account_code = ? WHERE id = ?").run(code, h.id);
      return code;
    }

    // 3. Lookup by account name
    const accByName = db.prepare("SELECT code FROM accounts WHERE name = ?").get(String(supplierId)) as any;
    if (accByName?.code) return accByName.code;

    // 4. Lookup by account code or ID
    const acc = db.prepare("SELECT code FROM accounts WHERE code = ? OR id = ?").get(String(supplierId), supplierId) as any;
    if (acc && acc.code) return acc.code;

    // 5. Dynamic auto-creation for supplier agent string name
    const nameStr = String(supplierId).trim();
    if (nameStr && isNaN(Number(nameStr)) && nameStr.length > 1) {
      const code = createAccount(nameStr);
      return code;
    }
  } catch (e) {
    console.error("Error in getSupplierAccountCode:", e);
  }
  return "21100";
}

router.get("/travel/sub-accounts/:parentCode", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const { parentCode } = req.params;
  try {
    // Return direct sub-accounts of parentCode, or the parentCode account itself if no sub-accounts exist
    const subAccounts = db.prepare(`
      SELECT id, code, name, type, parent_code 
      FROM accounts 
      WHERE parent_code = ? OR code = ?
      ORDER BY code ASC
    `).all(parentCode, parentCode);
    res.json(subAccounts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

