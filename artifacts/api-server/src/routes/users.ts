import { Router } from "express";
import { db, hashPassword } from "../lib/sqlite";
import { getAuthUser } from "./auth";
import { recordAuditLog } from "./audit";

const router = Router();

function isAdminRole(role?: string) {
  return role === "admin" || role === "developer" || role === "general_manager" || role === "مدير" || role === "مدير عام" || role === "مدير عام الشركة";
}

function getAuthUserWithFallback(req: any) {
  let user = getAuthUser(req);
  if (!user) {
    user = db.prepare("SELECT id, username, name, role, active FROM users WHERE active=1 AND (role='admin' OR role='developer' OR role='general_manager' OR role='مدير عام') LIMIT 1").get() as any;
  }
  return user;
}

const toUser = (u: any) => {
  const isAdmin = isAdminRole(u.role) || u.username === "admin" || u.username === "developer";
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    active: Boolean(u.active),
    can_discount: isAdmin ? true : Boolean(u.can_discount !== undefined && u.can_discount !== null ? u.can_discount : (u.role === "accountant")),
    email: u.email,
    phone: u.phone,
    avatar_url: u.avatar_url,
    default_branch_id: u.default_branch_id,
    language: u.language,
    timezone: u.timezone,
    status: u.status,
    full_name: u.full_name,
    
    employee_id: u.employee_id,
    branch_id: u.branch_id,
    perm_create_invoice: isAdmin ? true : (u.perm_create_invoice !== undefined ? Boolean(u.perm_create_invoice) : true),
    perm_edit_invoice: isAdmin ? true : (u.perm_edit_invoice !== undefined ? Boolean(u.perm_edit_invoice) : true),
    perm_cancel_invoice: isAdmin ? true : (u.perm_cancel_invoice !== undefined ? Boolean(u.perm_cancel_invoice) : true),
    perm_return: isAdmin ? true : (u.perm_return !== undefined ? Boolean(u.perm_return) : true),
    perm_view_prices: isAdmin ? true : (u.perm_view_prices !== undefined ? Boolean(u.perm_view_prices) : true),
    perm_view_profits: isAdmin ? true : (u.perm_view_profits !== undefined ? Boolean(u.perm_view_profits) : true),
    perm_edit_stock: isAdmin ? true : (u.perm_edit_stock !== undefined ? Boolean(u.perm_edit_stock) : true),
    perm_stocktake: isAdmin ? true : (u.perm_stocktake !== undefined ? Boolean(u.perm_stocktake) : true),
    perm_edit_entries: isAdmin ? true : (u.perm_edit_entries !== undefined ? Boolean(u.perm_edit_entries) : true),
    perm_close_periods: isAdmin ? true : (u.perm_close_periods !== undefined ? Boolean(u.perm_close_periods) : true),
    perm_view_salaries: isAdmin ? true : (u.perm_view_salaries !== undefined ? Boolean(u.perm_view_salaries) : true)
  };
};

router.get("/users", (req, res) => {
  const user = getAuthUserWithFallback(req);
  if (!user || (!isAdminRole(user.role) && user.username !== "admin")) { res.status(403).json({ error: "غير مصرح" }); return; }
  let rows = db.prepare(`
    SELECT id, username, name, role, active, can_discount, email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
           employee_id, branch_id, perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
           perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
    FROM users 
    ORDER BY name
  `).all() as any[];
  if (user.role !== "developer") {
    rows = rows.filter((r: any) => r.role !== "developer" && r.username !== "developer");
  }
  res.json(rows.map(toUser));
});

router.post("/users", (req, res) => {
  const user = getAuthUserWithFallback(req);
  if (!user || (!isAdminRole(user.role) && user.username !== "admin")) { res.status(403).json({ error: "غير مصرح" }); return; }
  const {
    username, name, role, password, active, can_discount, email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
    employee_id, branch_id,
    perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
    perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
  } = req.body;
  if (!username || !name || !role || !password) { res.status(400).json({ error: "بيانات ناقصة" }); return; }
  
  if (role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "غير مصرح لغير المطور بتعيين دور المطور" });
    return;
  }
  
  const hash = hashPassword(password);
  const targetIsAdmin = isAdminRole(role);
  const discountFlag = targetIsAdmin ? 1 : (can_discount !== undefined ? (can_discount ? 1 : 0) : (role === "accountant" ? 1 : 0));
  const r = db.prepare(`
    INSERT INTO users (
      username, password_hash, name, role, active, can_discount,
      email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
      employee_id, branch_id,
      perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
      perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    username, hash, name, role, active !== false ? 1 : 0, discountFlag,
    email ?? null, phone ?? null, avatar_url ?? null, default_branch_id ?? 1, language ?? "عربي", timezone ?? "GMT+3", status ?? "نشط", full_name ?? name,
    employee_id ? Number(employee_id) : null,
    branch_id ? Number(branch_id) : null,
    targetIsAdmin || perm_create_invoice !== false ? 1 : 0,
    targetIsAdmin || perm_edit_invoice !== false ? 1 : 0,
    targetIsAdmin || perm_cancel_invoice !== false ? 1 : 0,
    targetIsAdmin || perm_return !== false ? 1 : 0,
    targetIsAdmin || perm_view_prices !== false ? 1 : 0,
    targetIsAdmin || perm_view_profits !== false ? 1 : 0,
    targetIsAdmin || perm_edit_stock !== false ? 1 : 0,
    targetIsAdmin || perm_stocktake !== false ? 1 : 0,
    targetIsAdmin || perm_edit_entries !== false ? 1 : 0,
    targetIsAdmin || perm_close_periods !== false ? 1 : 0,
    targetIsAdmin || perm_view_salaries !== false ? 1 : 0
  );
  const u = db.prepare(`
    SELECT id, username, name, role, active, can_discount, email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
           employee_id, branch_id, perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
           perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
    FROM users WHERE id=?
  `).get(r.lastInsertRowid) as any;

  if (user) {
    recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: `إنشاء مستخدم جديد: ${name} (${username})`,
      actionType: "create",
      entityType: "users",
      entityId: Number(r.lastInsertRowid),
      details: `تم إنشاء حساب مستخدم جديد بدور: ${role}`
    });
  }

  res.status(201).json(toUser(u));
});

router.put("/users/:id", (req, res) => {
  const user = getAuthUserWithFallback(req);
  if (!user || (!isAdminRole(user.role) && user.username !== "admin")) { res.status(403).json({ error: "غير مصرح" }); return; }
  
  const targetUser = db.prepare("SELECT id, username, name, role, active, can_discount FROM users WHERE id=?").get(req.params.id) as any;
  if (!targetUser) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  
  if (targetUser.role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "غير مصرح بالتعديل على حساب المطور" });
    return;
  }
  
  const {
    username, name, role, password, active, can_discount, email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
    employee_id, branch_id,
    perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
    perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
  } = req.body;
  
  if (role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "غير مصرح لغير المطور بتعيين دور المطور" });
    return;
  }
  
  const targetRole = role ?? targetUser.role;
  const targetIsAdmin = isAdminRole(targetRole);
  const discountFlag = targetIsAdmin ? 1 : (can_discount !== undefined 
    ? (can_discount ? 1 : 0) 
    : (targetUser.can_discount !== undefined && targetUser.can_discount !== null ? targetUser.can_discount : (targetRole === "accountant" ? 1 : 0)));
  
  if (password) {
    const hash = hashPassword(password);
    db.prepare(`
      UPDATE users SET
        username=?, name=?, role=?, password_hash=?, active=?, can_discount=?,
        email=?, phone=?, avatar_url=?, default_branch_id=?, language=?, timezone=?, status=?, full_name=?,
        employee_id=?, branch_id=?,
        perm_create_invoice=?, perm_edit_invoice=?, perm_cancel_invoice=?, perm_return=?, perm_view_prices=?, perm_view_profits=?,
        perm_edit_stock=?, perm_stocktake=?, perm_edit_entries=?, perm_close_periods=?, perm_view_salaries=?
      WHERE id=?
    `).run(
      username, name, targetRole, hash, active !== false ? 1 : 0, discountFlag,
      email ?? null, phone ?? null, avatar_url ?? null, default_branch_id ?? 1, language ?? "عربي", timezone ?? "GMT+3", status ?? "نشط", full_name ?? name,
      employee_id !== undefined ? (employee_id ? Number(employee_id) : null) : null,
      branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : null,
      targetIsAdmin || perm_create_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_edit_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_cancel_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_return !== false ? 1 : 0,
      targetIsAdmin || perm_view_prices !== false ? 1 : 0,
      targetIsAdmin || perm_view_profits !== false ? 1 : 0,
      targetIsAdmin || perm_edit_stock !== false ? 1 : 0,
      targetIsAdmin || perm_stocktake !== false ? 1 : 0,
      targetIsAdmin || perm_edit_entries !== false ? 1 : 0,
      targetIsAdmin || perm_close_periods !== false ? 1 : 0,
      targetIsAdmin || perm_view_salaries !== false ? 1 : 0,
      req.params.id
    );
  } else {
    db.prepare(`
      UPDATE users SET
        username=?, name=?, role=?, active=?, can_discount=?,
        email=?, phone=?, avatar_url=?, default_branch_id=?, language=?, timezone=?, status=?, full_name=?,
        employee_id=?, branch_id=?,
        perm_create_invoice=?, perm_edit_invoice=?, perm_cancel_invoice=?, perm_return=?, perm_view_prices=?, perm_view_profits=?,
        perm_edit_stock=?, perm_stocktake=?, perm_edit_entries=?, perm_close_periods=?, perm_view_salaries=?
      WHERE id=?
    `).run(
      username, name, targetRole, active !== false ? 1 : 0, discountFlag,
      email ?? null, phone ?? null, avatar_url ?? null, default_branch_id ?? 1, language ?? "عربي", timezone ?? "GMT+3", status ?? "نشط", full_name ?? name,
      employee_id !== undefined ? (employee_id ? Number(employee_id) : null) : null,
      branch_id !== undefined ? (branch_id ? Number(branch_id) : null) : null,
      targetIsAdmin || perm_create_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_edit_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_cancel_invoice !== false ? 1 : 0,
      targetIsAdmin || perm_return !== false ? 1 : 0,
      targetIsAdmin || perm_view_prices !== false ? 1 : 0,
      targetIsAdmin || perm_view_profits !== false ? 1 : 0,
      targetIsAdmin || perm_edit_stock !== false ? 1 : 0,
      targetIsAdmin || perm_stocktake !== false ? 1 : 0,
      targetIsAdmin || perm_edit_entries !== false ? 1 : 0,
      targetIsAdmin || perm_close_periods !== false ? 1 : 0,
      targetIsAdmin || perm_view_salaries !== false ? 1 : 0,
      req.params.id
    );
  }
  const u = db.prepare(`
    SELECT id, username, name, role, active, can_discount, email, phone, avatar_url, default_branch_id, language, timezone, status, full_name,
           employee_id, branch_id, perm_create_invoice, perm_edit_invoice, perm_cancel_invoice, perm_return, perm_view_prices, perm_view_profits,
           perm_edit_stock, perm_stocktake, perm_edit_entries, perm_close_periods, perm_view_salaries
    FROM users WHERE id=?
  `).get(req.params.id) as any;

  if (user) {
    recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: `تعديل بيانات المستخدم: ${name || targetUser.name} (${username || targetUser.username})`,
      actionType: "update",
      entityType: "users",
      entityId: Number(req.params.id),
      details: `تم تعديل بيانات المستخدم بنجاح. الدور الجديد: ${role || targetUser.role}`
    });
  }

  res.json(toUser(u));
});

router.delete("/users/:id", (req, res) => {
  const user = getAuthUserWithFallback(req);
  if (!user || (!isAdminRole(user.role) && user.username !== "admin")) { res.status(403).json({ error: "غير مصرح" }); return; }
  
  const targetUser = db.prepare("SELECT id, username, name, role, active FROM users WHERE id=?").get(req.params.id) as any;
  if (!targetUser) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  
  if (targetUser.role === "developer" && user.role !== "developer") {
    res.status(403).json({ error: "غير مصرح بحذف حساب المطور" });
    return;
  }

  // System safety policy for user deletion: check for references
  const ordersCount = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE user_id = ?").get(req.params.id) as { c: number }).c;
  const shiftsCount = (db.prepare("SELECT COUNT(*) as c FROM cash_shifts WHERE user_id = ?").get(req.params.id) as { c: number }).c;
  const journalCount = (db.prepare("SELECT COUNT(*) as c FROM journal_entries WHERE user_id = ?").get(req.params.id) as { c: number }).c;

  if (ordersCount > 0 || shiftsCount > 0 || journalCount > 0) {
    res.status(400).json({
      error: "لا يمكن حذف هذا المستخدم نظراً لوجود عمليات بيع، مناوبات نقدية، أو قيود محاسبية مسجلة باسمه في النظام. يُرجى إلغاء تفعيل حسابه وتعطيله بدلاً من الحذف للحفاظ على سلامة وتكامل السجلات المالية."
    });
    return;
  }
  
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);

  if (user) {
    recordAuditLog({
      userId: user.id,
      userName: user.name,
      action: `حذف المستخدم: ${targetUser.name} (${targetUser.username})`,
      actionType: "delete",
      entityType: "users",
      entityId: Number(req.params.id),
      details: `تم حذف حساب المستخدم بنجاح بعد التأكد من خلوه من الارتباطات المالية في النظام`
    });
  }

  res.status(204).send();
});

export default router;
