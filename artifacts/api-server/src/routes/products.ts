import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

router.get("/products", (req, res) => {
  const { categoryId, show_in_pos, is_sellable, item_type } = req.query;
  const search = (req.query.search || req.query.q) as string | undefined;
  
  let sql = `
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock,
           p.min_stock, p.max_stock, p.unit, p.multi_units, p.supplier_id, p.supplier_name,
           p.warehouse_id, p.warehouse_name, p.image_url, p.tax_rate, p.batch_number, p.expiry_date,
           p.is_sellable, p.show_in_pos, p.item_type
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (categoryId) { 
    sql += " AND p.category_id=?"; 
    params.push(categoryId); 
  }
  if (show_in_pos !== undefined) {
    sql += " AND p.show_in_pos=?";
    params.push(show_in_pos === "true" || show_in_pos === "1" ? 1 : 0);
  }
  if (is_sellable !== undefined) {
    sql += " AND p.is_sellable=?";
    params.push(is_sellable === "true" || is_sellable === "1" ? 1 : 0);
  }
  if (item_type) {
    sql += " AND p.item_type=?";
    params.push(item_type);
  }
  if (search) { 
    sql += " AND (p.name LIKE ? OR p.barcode LIKE ? OR CAST(p.number AS TEXT) = ?)"; 
    params.push(`%${search}%`, `%${search}%`, search); 
  }
  
  sql += " ORDER BY p.number";
  
  const rows = (db.prepare(sql).all(...params) as any[]).map(r => ({ 
    ...r, 
    active: Boolean(r.active),
    is_sellable: r.is_sellable !== undefined ? Boolean(r.is_sellable) : true,
    show_in_pos: r.show_in_pos !== undefined ? Boolean(r.show_in_pos) : true,
  }));
  
  res.json(rows);
});

router.get("/products/next-number", (req, res) => {
  try {
    const row = db.prepare("SELECT MAX(number) as maxNum FROM products").get() as { maxNum: number | null };
    const nextNumber = (row?.maxNum || 0) + 1;
    res.json({ nextNumber });
  } catch (err) {
    res.json({ nextNumber: 1 });
  }
});

router.get("/products/:id", (req, res) => {
  const row = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock,
           p.min_stock, p.max_stock, p.unit, p.multi_units, p.supplier_id, p.supplier_name,
           p.warehouse_id, p.warehouse_name, p.image_url, p.tax_rate, p.batch_number, p.expiry_date,
           p.is_sellable, p.show_in_pos, p.item_type
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id=?
  `).get(req.params.id) as any;
  
  if (!row) { 
    res.status(404).json({ error: "غير موجود" }); 
    return; 
  }
  
  res.json({ 
    ...row, 
    active: Boolean(row.active),
    is_sellable: row.is_sellable !== undefined ? Boolean(row.is_sellable) : true,
    show_in_pos: row.show_in_pos !== undefined ? Boolean(row.show_in_pos) : true,
  });
});

router.post("/products", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  
  let { 
    name, number, price, cost, barcode, categoryId, active, stock,
    min_stock, max_stock, unit, multi_units, supplier_id, supplier_name,
    warehouse_id, warehouse_name, image_url, tax_rate, batch_number, expiry_date,
    is_sellable, show_in_pos, item_type
  } = req.body;
  
  if (!name || price === undefined) { 
    res.status(400).json({ error: "بيانات ناقصة: الاسم والسعر مطلوبان" }); 
    return; 
  }

  // Auto-generate number if not provided
  if (!number || number === 0) {
    const row = db.prepare("SELECT MAX(number) as maxNum FROM products").get() as { maxNum: number | null };
    number = (row?.maxNum || 0) + 1;
  }

  // Ensure logical fallbacks for booleans/item types
  const sellableVal = is_sellable !== false ? 1 : 0;
  const showInPosVal = show_in_pos !== false ? 1 : 0;
  const typeVal = item_type || "sellable";

  const r = db.prepare(`
    INSERT INTO products (
      name, number, price, cost, barcode, category_id, active, stock,
      min_stock, max_stock, unit, multi_units, supplier_id, supplier_name,
      warehouse_id, warehouse_name, image_url, tax_rate, batch_number, expiry_date,
      is_sellable, show_in_pos, item_type
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    name, number, price, cost ?? null, barcode ?? null, categoryId ?? null, active !== false ? 1 : 0, stock ?? null,
    min_stock ?? 10, max_stock ?? 1000, unit ?? 'حبة', multi_units ?? null, supplier_id ?? 1, supplier_name ?? null,
    warehouse_id ?? 1, warehouse_name ?? 'المخزن الرئيسي', image_url ?? null, tax_rate ?? 15.0, batch_number ?? null, expiry_date ?? null,
    sellableVal, showInPosVal, typeVal
  );

  const prod = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock,
           p.min_stock, p.max_stock, p.unit, p.multi_units, p.supplier_id, p.supplier_name,
           p.warehouse_id, p.warehouse_name, p.image_url, p.tax_rate, p.batch_number, p.expiry_date,
           p.is_sellable, p.show_in_pos, p.item_type
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id=?
  `).get(r.lastInsertRowid) as any;
  
  res.status(201).json({ 
    ...prod, 
    active: Boolean(prod.active),
    is_sellable: prod.is_sellable !== undefined ? Boolean(prod.is_sellable) : true,
    show_in_pos: prod.show_in_pos !== undefined ? Boolean(prod.show_in_pos) : true,
  });
});

router.put("/products/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  
  const { 
    name, number, price, cost, barcode, categoryId, active, stock,
    min_stock, max_stock, unit, multi_units, supplier_id, supplier_name,
    warehouse_id, warehouse_name, image_url, tax_rate, batch_number, expiry_date,
    is_sellable, show_in_pos, item_type
  } = req.body;
  
  const sellableVal = is_sellable !== false ? 1 : 0;
  const showInPosVal = show_in_pos !== false ? 1 : 0;
  const typeVal = item_type || "sellable";

  db.prepare(`
    UPDATE products SET 
      name=?, number=?, price=?, cost=?, barcode=?, category_id=?, active=?, stock=?,
      min_stock=?, max_stock=?, unit=?, multi_units=?, supplier_id=?, supplier_name=?,
      warehouse_id=?, warehouse_name=?, image_url=?, tax_rate=?, batch_number=?, expiry_date=?,
      is_sellable=?, show_in_pos=?, item_type=?
    WHERE id=?
  `).run(
    name, number, price, cost ?? null, barcode ?? null, categoryId ?? null, active !== false ? 1 : 0, stock ?? null,
    min_stock ?? 10, max_stock ?? 1000, unit ?? 'حبة', multi_units ?? null, supplier_id ?? 1, supplier_name ?? null,
    warehouse_id ?? 1, warehouse_name ?? 'المخزن الرئيسي', image_url ?? null, tax_rate ?? 15.0, batch_number ?? null, expiry_date ?? null,
    sellableVal, showInPosVal, typeVal,
    req.params.id
  );
  
  const prod = db.prepare(`
    SELECT p.id, p.number, p.name, p.price, p.cost, p.barcode,
           p.category_id as categoryId, c.name as categoryName, p.active, p.stock,
           p.min_stock, p.max_stock, p.unit, p.multi_units, p.supplier_id, p.supplier_name,
           p.warehouse_id, p.warehouse_name, p.image_url, p.tax_rate, p.batch_number, p.expiry_date,
           p.is_sellable, p.show_in_pos, p.item_type
    FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id=?
  `).get(req.params.id) as any;
  
  res.json({ 
    ...prod, 
    active: Boolean(prod.active),
    is_sellable: prod.is_sellable !== undefined ? Boolean(prod.is_sellable) : true,
    show_in_pos: prod.show_in_pos !== undefined ? Boolean(prod.show_in_pos) : true,
  });
});

router.delete("/products/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.status(204).send();
});

export default router;
