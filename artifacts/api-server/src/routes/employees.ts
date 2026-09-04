import { Router } from "express";
import { db } from "../lib/sqlite";

const router = Router();

router.get("/employees", (req, res) => {
  try {
    const { search, role } = req.query;
    let sql = `
      SELECT e.*, d.name as department_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (role) {
      sql += " AND e.position = ?";
      params.push(role);
    }
    if (search) {
      sql += " AND (e.name LIKE ? OR e.phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY e.name";
    const rows = db.prepare(sql).all(...params) as any[];
    res.json(rows.map(e => ({ ...e, active: Boolean(e.active) })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/employees", (req, res) => {
  try {
    const { name, phone, email, role, salary, joinDate, position, department_id } = req.body;
    const pos = position || role || "موظف";
    const sal = salary ? Number(salary) : 0;
    const r = db.prepare(`
      INSERT INTO hr_employees (name, phone, email, position, base_salary, hire_date, department_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(name, phone || null, email || null, pos, sal, joinDate || new Date().toISOString().slice(0, 10), department_id || 1);

    const created = db.prepare("SELECT * FROM hr_employees WHERE id=?").get(r.lastInsertRowid);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/employees/:id", (req, res) => {
  try {
    const emp = db.prepare("SELECT * FROM hr_employees WHERE id=?").get(req.params.id);
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });
    res.json(emp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/employees/:id", (req, res) => {
  try {
    const { name, phone, email, role, salary, isActive, joinDate, position } = req.body;
    const emp = db.prepare("SELECT * FROM hr_employees WHERE id=?").get(req.params.id) as any;
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });

    db.prepare(`
      UPDATE hr_employees
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          position = COALESCE(?, position),
          base_salary = COALESCE(?, base_salary),
          active = COALESCE(?, active),
          hire_date = COALESCE(?, hire_date)
      WHERE id = ?
    `).run(
      name ?? null,
      phone ?? null,
      email ?? null,
      position || role || null,
      salary ? Number(salary) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      joinDate ?? null,
      req.params.id
    );

    const updated = db.prepare("SELECT * FROM hr_employees WHERE id=?").get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/employees/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_employees WHERE id=?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
