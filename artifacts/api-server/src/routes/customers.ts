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
  if (!name) { res.status(400).json({ error: "اسم المكتب أو الوكالة مطلوب" }); return; }

  const stmt = db.prepare(`
    INSERT INTO travel_partner_offices (name, name_en, office_type, city, phone, email, contact_person, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const r = stmt.run(
    name, name_en || null, office_type || 'partner_agency', city || null, phone || null, email || null,
    contact_person || null, notes || null
  );
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
           COALESCE(SUM(o.total), 0) + COALESCE((SELECT SUM(selling_price) FROM travel_bookings WHERE customer_id = c.id), 0) as totalPurchases,
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
    affiliation_type || 'direct', office_id ? Number(office_id) : null, office_name || null, office_phone || null, account_code || null
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
    affiliation_type || 'direct', office_id ? Number(office_id) : null, office_name || null, office_phone || null, account_code || null,
    req.params.id
  );

  const cust = db.prepare(`SELECT c.*, c.created_at as createdAt FROM customers c WHERE c.id=?`).get(req.params.id);
  res.json(cust);
});

router.delete("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  res.status(204).send();
});

export function getCustomerAccountCode(customerId: any): string {
  if (!customerId) return "11200";
  try {
    const cust = db.prepare("SELECT account_code, name, affiliation_type FROM customers WHERE id = ? OR name = ?").get(customerId, String(customerId)) as any;
    if (cust) {
      if (cust.account_code) return cust.account_code;
      if (cust.affiliation_type === 'agency') return "21100";
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
    const tc = db.prepare("SELECT id, account_code, company_name, name FROM travel_transport_companies WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
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

    const po = db.prepare("SELECT id, account_code, name FROM travel_partner_offices WHERE id = ? OR name = ?").get(supplierId, String(supplierId)) as any;
    if (po) {
      if (po.account_code) return po.account_code;
      const poName = po.name || `مكتب شركاء #${po.id}`;
      const code = createAccount(poName);
      db.prepare("UPDATE travel_partner_offices SET account_code = ? WHERE id = ?").run(code, po.id);
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

