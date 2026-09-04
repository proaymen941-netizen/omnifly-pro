import { Router } from "express";
import { db } from "../lib/sqlite";
import { getAuthUser } from "./auth";

const router = Router();

router.get("/reports/sales", (req, res) => {
  const user = getAuthUser(req);
  const { startDate, endDate, groupBy = "day" } = req.query;
  let format = "%Y-%m-%d";
  if (groupBy === "month") format = "%Y-%m";
  if (groupBy === "year") format = "%Y";

  let devFilter = "";
  if (!user || user.role !== "developer") {
    devFilter = " AND user_id NOT IN (SELECT id FROM users WHERE role='developer' OR username='developer') ";
  }

  let sql = `
    SELECT strftime(?, created_at) as period,
           COALESCE(SUM(total), 0) as total,
           COALESCE(SUM(subtotal), 0) as subtotal,
           COALESCE(SUM(discount), 0) as discount,
           COALESCE(SUM(tax), 0) as tax,
           COUNT(*) as orders
    FROM orders WHERE (status IS NULL OR status != 'cancelled') ${devFilter}
  `;
  const params: any[] = [format];
  if (startDate) { sql += " AND DATE(created_at)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(created_at)<=?"; params.push(endDate); }
  sql += " GROUP BY period ORDER BY period";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get("/reports/by-cashier", (req, res) => {
  const user = getAuthUser(req);
  const { startDate, endDate } = req.query;

  let dateFilterOrders = "";
  let dateFilterReturns = "";
  const params: any[] = [];

  if (startDate) {
    dateFilterOrders += " AND DATE(o.created_at)>=? ";
    dateFilterReturns += " AND DATE(r.created_at)>=? ";
    params.push(startDate);
  }
  if (endDate) {
    dateFilterOrders += " AND DATE(o.created_at)<=? ";
    dateFilterReturns += " AND DATE(r.created_at)<=? ";
    params.push(endDate);
  }

  let devFilter = "";
  if (!user || user.role !== "developer") {
    devFilter = " AND u.role != 'developer' AND u.username != 'developer' ";
  }

  const sql = `
    SELECT 
      u.id as userId, 
      u.name as userName,
      u.role as userRole,
      COUNT(DISTINCT o.id) as orders,
      COALESCE(SUM(o.total), 0) as grossTotal,
      COALESCE(ret.returnsTotal, 0) as returnsTotal,
      COALESCE(ret.returnsCount, 0) as returnsCount,
      (COALESCE(SUM(o.total), 0) - COALESCE(ret.returnsTotal, 0)) as total,
      COALESCE(SUM(o.subtotal), 0) as subtotal,
      COALESCE(SUM(o.discount), 0) as discount,
      COALESCE(SUM(o.tax), 0) as tax
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id AND (o.status IS NULL OR o.status != 'cancelled') ${dateFilterOrders}
    LEFT JOIN (
      SELECT 
        COALESCE(o2.user_id, r.user_id) as uid,
        SUM(r.total_refund) as returnsTotal,
        COUNT(r.id) as returnsCount
      FROM returns r
      LEFT JOIN orders o2 ON o2.id = r.order_id OR (r.order_id IS NULL AND o2.invoice_number = r.invoice_number)
      WHERE 1=1 ${dateFilterReturns}
      GROUP BY COALESCE(o2.user_id, r.user_id)
    ) ret ON ret.uid = u.id
    WHERE u.active = 1 ${devFilter}
    GROUP BY u.id, u.name, u.role
    HAVING orders > 0 OR returnsTotal > 0
    ORDER BY total DESC
  `;

  try {
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/reports/by-product", (req, res) => {
  const user = getAuthUser(req);
  const { startDate, endDate, limit } = req.query;
  
  let devFilter = "";
  if (!user || user.role !== "developer") {
    devFilter = " AND o.user_id NOT IN (SELECT id FROM users WHERE role='developer' OR username='developer') ";
  }

  let sql = `
    SELECT oi.product_id as productId, 
           oi.product_name as productName,
           COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') as categoryName,
           COALESCE(oi.category_id, p.category_id) as categoryId,
           ROUND(COALESCE(AVG(oi.unit_price), 0), 2) as unitPrice,
           SUM(oi.quantity) as totalQty,
           COALESCE(SUM(oi.total), 0) as totalRevenue,
           COALESCE(SUM((oi.unit_price - COALESCE(p.cost, 0)) * oi.quantity), 0) as totalProfit,
           COUNT(DISTINCT oi.order_id) as orderCount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = COALESCE(oi.category_id, p.category_id)
    WHERE (o.status IS NULL OR o.status != 'cancelled') ${devFilter}
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(o.created_at)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(o.created_at)<=?"; params.push(endDate); }
  sql += " GROUP BY oi.product_id, oi.product_name, COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') ORDER BY totalRevenue DESC";
  if (limit) {
    sql += " LIMIT ?";
    params.push(Number(limit));
  }

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get("/reports/by-category", (req, res) => {
  const user = getAuthUser(req);
  const { startDate, endDate } = req.query;

  let devFilter = "";
  if (!user || user.role !== "developer") {
    devFilter = " AND o.user_id NOT IN (SELECT id FROM users WHERE role='developer' OR username='developer') ";
  }

  let categorySql = `
    SELECT COALESCE(oi.category_id, p.category_id) as categoryId,
           COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') as categoryName,
           SUM(oi.quantity) as totalQty,
           COALESCE(SUM(oi.total), 0) as totalRevenue,
           COUNT(DISTINCT oi.order_id) as orderCount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = COALESCE(oi.category_id, p.category_id)
    WHERE (o.status IS NULL OR o.status != 'cancelled') ${devFilter}
  `;
  const catParams: any[] = [];
  if (startDate) { categorySql += " AND DATE(o.created_at)>=?"; catParams.push(startDate); }
  if (endDate) { categorySql += " AND DATE(o.created_at)<=?"; catParams.push(endDate); }
  categorySql += " GROUP BY COALESCE(oi.category_id, p.category_id), COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') ORDER BY totalRevenue DESC";

  const categories = db.prepare(categorySql).all(...catParams) as any[];

  let itemsSql = `
    SELECT oi.product_id as productId,
           oi.product_name as productName,
           COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') as categoryName,
           COALESCE(oi.category_id, p.category_id) as categoryId,
           ROUND(COALESCE(AVG(oi.unit_price), 0), 2) as unitPrice,
           SUM(oi.quantity) as totalQty,
           COALESCE(SUM(oi.total), 0) as totalRevenue,
           COALESCE(SUM((oi.unit_price - COALESCE(p.cost, 0)) * oi.quantity), 0) as totalProfit,
           COUNT(DISTINCT oi.order_id) as orderCount
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    LEFT JOIN categories c ON c.id = COALESCE(oi.category_id, p.category_id)
    WHERE (o.status IS NULL OR o.status != 'cancelled') ${devFilter}
  `;
  const itemsParams: any[] = [];
  if (startDate) { itemsSql += " AND DATE(o.created_at)>=?"; itemsParams.push(startDate); }
  if (endDate) { itemsSql += " AND DATE(o.created_at)<=?"; itemsParams.push(endDate); }
  itemsSql += " GROUP BY oi.product_id, oi.product_name, COALESCE(NULLIF(oi.category_name, ''), c.name, 'غير مصنّف') ORDER BY totalRevenue DESC";

  const allItems = db.prepare(itemsSql).all(...itemsParams) as any[];

  const categoriesWithItems = categories.map(cat => {
    const items = allItems.filter(item => 
      (cat.categoryId && item.categoryId === cat.categoryId) ||
      (cat.categoryName && item.categoryName === cat.categoryName)
    );
    return {
      ...cat,
      items
    };
  });

  res.json(categoriesWithItems);
});

router.get("/reports/by-payment", (req, res) => {
  const user = getAuthUser(req);
  const { startDate, endDate } = req.query;

  let devFilter = "";
  if (!user || user.role !== "developer") {
    devFilter = " AND user_id NOT IN (SELECT id FROM users WHERE role='developer' OR username='developer') ";
  }

  let sql = `
    SELECT payment_method as paymentMethod,
           COUNT(*) as orders,
           COALESCE(SUM(total), 0) as total
    FROM orders WHERE (status IS NULL OR status != 'cancelled') ${devFilter}
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(created_at)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(created_at)<=?"; params.push(endDate); }
  sql += " GROUP BY payment_method ORDER BY total DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

/* ─── Additional Comprehensive Reports ─── */

// 1. Purchases & Suppliers Report
router.get("/reports/purchases", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT pi.id, pi.invoice_number as invoiceNumber, pi.supplier_name as supplierName,
           pi.invoice_date as invoiceDate, pi.total, pi.paid_amount as paidAmount,
           pi.remaining_amount as remainingAmount, pi.payment_status as paymentStatus
    FROM purchase_invoices pi
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(pi.invoice_date)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(pi.invoice_date)<=?"; params.push(endDate); }
  sql += " ORDER BY pi.invoice_date DESC";

  const rows = db.prepare(sql).all(...params);
  const totals = rows.reduce((acc: any, r: any) => {
    acc.totalPurchases += r.total;
    acc.totalPaid += r.paidAmount;
    acc.totalRemaining += r.remainingAmount;
    return acc;
  }, { totalPurchases: 0, totalPaid: 0, totalRemaining: 0 });

  res.json({ rows, totals });
});

// 2. Inventory & Stock Valuation Report
router.get("/reports/inventory", (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, c.name as categoryName, p.stock, p.min_stock as minStock,
             p.cost, p.price, (p.stock * p.cost) as totalCostValuation,
             (p.stock * p.price) as totalSalesValuation
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1
      ORDER BY p.stock ASC
    `).all();

    const totals = products.reduce((acc: any, p: any) => {
      acc.totalItems += 1;
      acc.totalStockUnits += (p.stock || 0);
      acc.totalCostValuation += (p.totalCostValuation || 0);
      acc.totalSalesValuation += (p.totalSalesValuation || 0);
      if ((p.stock || 0) <= (p.minStock || 0)) acc.lowStockCount += 1;
      return acc;
    }, { totalItems: 0, totalStockUnits: 0, totalCostValuation: 0, totalSalesValuation: 0, lowStockCount: 0 });

    res.json({ products, totals });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Operational Expenses Summary
router.get("/reports/expenses", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT category, COALESCE(SUM(amount), 0) as totalAmount, COUNT(*) as count
    FROM expenses
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(expense_date)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(expense_date)<=?"; params.push(endDate); }
  sql += " GROUP BY category ORDER BY totalAmount DESC";

  const categories = db.prepare(sql).all(...params);

  let detailSql = `SELECT * FROM expenses WHERE 1=1`;
  const detailParams: any[] = [];
  if (startDate) { detailSql += " AND DATE(expense_date)>=?"; detailParams.push(startDate); }
  if (endDate) { detailSql += " AND DATE(expense_date)<=?"; detailParams.push(endDate); }
  detailSql += " ORDER BY expense_date DESC LIMIT 100";

  const details = db.prepare(detailSql).all(...detailParams);
  const totalExpense = categories.reduce((s: number, c: any) => s + c.totalAmount, 0);

  res.json({ categories, details, totalExpense });
});

// 4. Shift Closures & Cashier Variance
router.get("/reports/shifts", (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let sql = `
      SELECT cs.*, cs.difference as variance, u.name as cashierName, COALESCE(s.name, 'الصندوق الرئيسي') as safeName
      FROM cash_shifts cs
      LEFT JOIN users u ON u.id = cs.user_id
      LEFT JOIN safes s ON s.id = cs.safe_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (startDate) { sql += " AND DATE(cs.start_time)>=?"; params.push(startDate); }
    if (endDate) { sql += " AND DATE(cs.start_time)<=?"; params.push(endDate); }
    sql += " ORDER BY cs.start_time DESC";

    const shifts = db.prepare(sql).all(...params);
    const totalVariance = shifts.reduce((s: number, sh: any) => s + (sh.variance || 0), 0);
    const totalCashSales = shifts.reduce((s: number, sh: any) => s + (sh.cash_sales || 0), 0);

    res.json({ shifts, totalVariance, totalCashSales });
  } catch (e: any) {
    console.error("Error in /reports/shifts:", e);
    res.status(500).json({ error: e.message });
  }
});

// 5. Tax & VAT Report (ZATCA VAT Summary)
router.get("/reports/tax", (req, res) => {
  const { startDate, endDate } = req.query;
  let salesSql = `
    SELECT COALESCE(SUM(subtotal), 0) as taxableSales,
           COALESCE(SUM(tax), 0) as outputTax,
           COUNT(*) as salesCount
    FROM orders WHERE status IS NULL OR status != 'cancelled'
  `;
  const salesParams: any[] = [];
  if (startDate) { salesSql += " AND DATE(created_at)>=?"; salesParams.push(startDate); }
  if (endDate) { salesSql += " AND DATE(created_at)<=?"; salesParams.push(endDate); }

  const salesTax = db.prepare(salesSql).get(...salesParams) as any;

  let purSql = `
    SELECT COALESCE(SUM(subtotal), 0) as taxablePurchases,
           COALESCE(SUM(tax), 0) as inputTax,
           COUNT(*) as purchaseCount
    FROM purchase_invoices WHERE 1=1
  `;
  const purParams: any[] = [];
  if (startDate) { purSql += " AND DATE(invoice_date)>=?"; purParams.push(startDate); }
  if (endDate) { purSql += " AND DATE(invoice_date)<=?"; purParams.push(endDate); }

  const purchaseTax = db.prepare(purSql).get(...purParams) as any;

  const netTaxPayable = (salesTax?.outputTax || 0) - (purchaseTax?.inputTax || 0);

  res.json({
    taxableSales: salesTax?.taxableSales || 0,
    outputTax: salesTax?.outputTax || 0,
    salesCount: salesTax?.salesCount || 0,
    taxablePurchases: purchaseTax?.taxablePurchases || 0,
    inputTax: purchaseTax?.inputTax || 0,
    purchaseCount: purchaseTax?.purchaseCount || 0,
    netTaxPayable
  });
});

// 6. Waste & Spoilage Report
router.get("/reports/waste", (req, res) => {
  const { startDate, endDate } = req.query;
  let sql = `
    SELECT w.*, COALESCE(w.total_cost, w.unit_cost * w.quantity) as cost, w.created_at as waste_date, p.name as productName, u.name as userName
    FROM stock_waste_records w
    LEFT JOIN products p ON p.id = w.product_id
    LEFT JOIN users u ON u.id = w.user_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (startDate) { sql += " AND DATE(w.created_at)>=?"; params.push(startDate); }
  if (endDate) { sql += " AND DATE(w.created_at)<=?"; params.push(endDate); }
  sql += " ORDER BY w.created_at DESC";

  const records = db.prepare(sql).all(...params);
  const totalCost = records.reduce((s: number, r: any) => s + (r.cost || 0), 0);

  res.json({ records, totalCost });
});

export default router;
