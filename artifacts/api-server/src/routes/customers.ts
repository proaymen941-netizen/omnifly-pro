import { Router } from "express";
import { db } from "../lib/sqlite";
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
    sql += ` AND (c.name LIKE ? OR c.name_en LIKE ? OR c.phone LIKE ? OR c.passport_number LIKE ? OR c.national_id LIKE ? OR c.office_name LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s, s, s);
  }

  sql += ` GROUP BY c.id ORDER BY c.id DESC`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.post("/customers", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    name, name_en, phone, alternate_phone, email, address, nationality, country,
    dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
    employer, notes, customer_type,
    affiliation_type, office_id, office_name, office_phone, account_code
  } = req.body;

  if (!name) { res.status(400).json({ error: "اسم العميل مطلوب" }); return; }

  const stmt = db.prepare(`
    INSERT INTO customers (
      name, name_en, phone, alternate_phone, email, address, nationality, country,
      dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
      employer, notes, customer_type,
      affiliation_type, office_id, office_name, office_phone, account_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const r = stmt.run(
    name, name_en || null, phone || null, alternate_phone || null, email || null, address || null,
    nationality || null, country || null, dob || null, gender || null, national_id || null,
    passport_number || null, passport_issue_date || null, passport_expiry_date || null,
    employer || null, notes || null, customer_type || 'individual',
    affiliation_type || 'direct', office_id ? Number(office_id) : null, office_name || null, office_phone || null, account_code || null
  );

  const cust = db.prepare("SELECT *, 0 as totalPurchases, created_at as createdAt FROM customers WHERE id=?").get(r.lastInsertRowid);
  res.status(201).json(cust);
});

router.put("/customers/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const {
    name, name_en, phone, alternate_phone, email, address, nationality, country,
    dob, gender, national_id, passport_number, passport_issue_date, passport_expiry_date,
    employer, notes, customer_type,
    affiliation_type, office_id, office_name, office_phone, account_code
  } = req.body;

  db.prepare(`
    UPDATE customers SET
      name=?, name_en=?, phone=?, alternate_phone=?, email=?, address=?, nationality=?, country=?,
      dob=?, gender=?, national_id=?, passport_number=?, passport_issue_date=?, passport_expiry_date=?,
      employer=?, notes=?, customer_type=?,
      affiliation_type=?, office_id=?, office_name=?, office_phone=?, account_code=?
    WHERE id=?
  `).run(
    name, name_en || null, phone || null, alternate_phone || null, email || null, address || null,
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
    const cust = db.prepare("SELECT account_code, affiliation_type FROM customers WHERE id = ?").get(customerId) as any;
    if (cust) {
      if (cust.account_code) return cust.account_code;
      if (cust.affiliation_type === 'agency') return "21100";
    }
  } catch (e) {
    console.error("Error in getCustomerAccountCode:", e);
  }
  return "11200";
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

