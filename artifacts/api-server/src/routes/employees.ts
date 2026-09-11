import { Router } from "express";
import { db } from "../lib/sqlite";

const router = Router();

// ==================== DEPARTMENTS ====================
router.get("/hr/departments", (req, res) => {
  try {
    const depts = db.prepare("SELECT * FROM hr_departments ORDER BY name").all();
    res.json(depts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/departments", (req, res) => {
  try {
    const { name, budget } = req.body;
    if (!name) return res.status(400).json({ error: "اسم القسم مطلوب" });
    const r = db.prepare("INSERT INTO hr_departments (name, budget) VALUES (?, ?)").run(name, Number(budget) || 0);
    const created = db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/departments/:id", (req, res) => {
  try {
    const { name, budget } = req.body;
    db.prepare("UPDATE hr_departments SET name = COALESCE(?, name), budget = COALESCE(?, budget) WHERE id = ?")
      .run(name ?? null, budget !== undefined ? Number(budget) : null, req.params.id);
    const updated = db.prepare("SELECT * FROM hr_departments WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/departments/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_departments WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== EMPLOYEES ====================
router.get(["/employees", "/hr/employees"], (req, res) => {
  try {
    const { search, role, department_id } = req.query;
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
    if (department_id) {
      sql += " AND e.department_id = ?";
      params.push(department_id);
    }
    if (search) {
      sql += " AND (e.name LIKE ? OR e.phone LIKE ? OR e.employee_number LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY e.name";
    const rows = db.prepare(sql).all(...params) as any[];
    res.json(rows.map(e => ({ ...e, active: Boolean(e.active) })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(["/employees", "/hr/employees"], (req, res) => {
  try {
    let { 
      employee_number, 
      name, 
      phone, 
      position, 
      role, 
      department_id, 
      basic_salary, 
      salary, 
      base_salary, 
      hire_date, 
      joinDate, 
      active,
      branch_id,
      job_title,
      commission_rate,
      commission_basis,
      sales_target
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "اسم الموظف مطلوب" });
    }

    const pos = position || role || "موظف";
    const sal = Number(basic_salary ?? salary ?? base_salary ?? 0) || 0;
    const hDate = hire_date || joinDate || new Date().toISOString().slice(0, 10);
    const isActive = active !== undefined ? (active ? 1 : 0) : 1;

    // Handle department_id: if string is department name, create or get it
    let deptId: number | null = null;
    if (department_id !== undefined && department_id !== null && department_id !== "") {
      if (!isNaN(Number(department_id))) {
        deptId = Number(department_id);
      } else {
        const deptName = String(department_id).trim();
        let existingDept = db.prepare("SELECT id FROM hr_departments WHERE name = ?").get(deptName) as any;
        if (!existingDept) {
          const insertDept = db.prepare("INSERT INTO hr_departments (name, budget) VALUES (?, 0)").run(deptName);
          deptId = Number(insertDept.lastInsertRowid);
        } else {
          deptId = existingDept.id;
        }
      }
    }

    // Auto-generate employee_number if not provided or empty
    let empNum = employee_number ? String(employee_number).trim() : "";
    if (!empNum) {
      const last = db.prepare("SELECT MAX(id) as max_id FROM hr_employees").get() as any;
      const nextId = (last?.max_id || 0) + 1;
      empNum = `EMP-${String(nextId).padStart(3, "0")}`;
    }

    // Check if employee_number already exists and generate unique if needed
    const existing = db.prepare("SELECT id FROM hr_employees WHERE employee_number = ?").get(empNum);
    if (existing) {
      const count = db.prepare("SELECT COUNT(*) as c FROM hr_employees").get() as any;
      empNum = `EMP-${String((count?.c || 0) + 1).padStart(3, "0")}-${Date.now().toString().slice(-4)}`;
    }

    const r = db.prepare(`
      INSERT INTO hr_employees (
        employee_number, name, phone, position, department_id, basic_salary, hire_date, active,
        branch_id, job_title, commission_rate, commission_basis, sales_target
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      empNum,
      String(name).trim(),
      phone || null,
      pos,
      deptId,
      sal,
      hDate,
      isActive,
      branch_id ? Number(branch_id) : 1,
      job_title || pos,
      commission_rate !== undefined ? Number(commission_rate) : 5.0,
      commission_basis || "sales_value",
      sales_target !== undefined ? Number(sales_target) : 50000.0
    );

    const created = db.prepare(`
      SELECT e.*, d.name as department_name 
      FROM hr_employees e 
      LEFT JOIN hr_departments d ON d.id = e.department_id 
      WHERE e.id = ?
    `).get(r.lastInsertRowid);

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get(["/employees/:id", "/hr/employees/:id"], (req, res) => {
  try {
    const emp = db.prepare(`
      SELECT e.*, d.name as department_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE e.id = ?
    `).get(req.params.id);
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });
    res.json(emp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleUpdateEmployee = (req: any, res: any) => {
  try {
    const { 
      employee_number, 
      name, 
      phone, 
      position, 
      role, 
      department_id, 
      basic_salary, 
      salary, 
      base_salary, 
      hire_date, 
      joinDate, 
      active, 
      isActive,
      branch_id,
      job_title,
      commission_rate,
      commission_basis,
      sales_target
    } = req.body;

    const emp = db.prepare("SELECT * FROM hr_employees WHERE id = ?").get(req.params.id) as any;
    if (!emp) return res.status(404).json({ error: "الموظف غير موجود" });

    let deptId = emp.department_id;
    if (department_id !== undefined) {
      if (department_id === null || department_id === "") {
        deptId = null;
      } else if (!isNaN(Number(department_id))) {
        deptId = Number(department_id);
      } else {
        const deptName = String(department_id).trim();
        let existingDept = db.prepare("SELECT id FROM hr_departments WHERE name = ?").get(deptName) as any;
        if (!existingDept) {
          const insertDept = db.prepare("INSERT INTO hr_departments (name, budget) VALUES (?, 0)").run(deptName);
          deptId = Number(insertDept.lastInsertRowid);
        } else {
          deptId = existingDept.id;
        }
      }
    }

    const sal = (basic_salary !== undefined ? Number(basic_salary) : (salary !== undefined ? Number(salary) : (base_salary !== undefined ? Number(base_salary) : emp.basic_salary)));
    const activeVal = (active !== undefined ? (active ? 1 : 0) : (isActive !== undefined ? (isActive ? 1 : 0) : emp.active));

    db.prepare(`
      UPDATE hr_employees
      SET employee_number = COALESCE(?, employee_number),
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          position = COALESCE(?, position),
          department_id = ?,
          basic_salary = COALESCE(?, basic_salary),
          hire_date = COALESCE(?, hire_date),
          active = COALESCE(?, active),
          branch_id = COALESCE(?, branch_id),
          job_title = COALESCE(?, job_title),
          commission_rate = COALESCE(?, commission_rate),
          commission_basis = COALESCE(?, commission_basis),
          sales_target = COALESCE(?, sales_target)
      WHERE id = ?
    `).run(
      employee_number ?? null,
      name ?? null,
      phone ?? null,
      position || role || null,
      deptId,
      sal,
      hire_date || joinDate || null,
      activeVal,
      branch_id !== undefined ? Number(branch_id) : null,
      job_title || null,
      commission_rate !== undefined ? Number(commission_rate) : null,
      commission_basis || null,
      sales_target !== undefined ? Number(sales_target) : null,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT e.*, d.name as department_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE e.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.patch(["/employees/:id", "/hr/employees/:id"], handleUpdateEmployee);
router.put(["/employees/:id", "/hr/employees/:id"], handleUpdateEmployee);

router.delete(["/employees/:id", "/hr/employees/:id"], (req, res) => {
  try {
    db.prepare("DELETE FROM hr_employees WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SALARIES ====================
router.get("/hr/salaries", (req, res) => {
  try {
    const { month, employee_id } = req.query;
    let sql = `
      SELECT s.*, e.name as employee_name, e.employee_number, d.name as department_name
      FROM hr_salaries s
      JOIN hr_employees e ON e.id = s.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (month) {
      sql += " AND s.month = ?";
      params.push(month);
    }
    if (employee_id) {
      sql += " AND s.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY s.id DESC";
    const salaries = db.prepare(sql).all(...params);
    res.json(salaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/salaries", (req, res) => {
  try {
    const { employee_id, month, basic_salary, bonuses, deductions, status, notes } = req.body;
    const bSal = Number(basic_salary) || 0;
    const bon = Number(bonuses) || 0;
    const ded = Number(deductions) || 0;
    const net = bSal + bon - ded;

    const r = db.prepare(`
      INSERT INTO hr_salaries (employee_id, month, basic_salary, bonuses, deductions, net_salary, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), month, bSal, bon, ded, net, status || 'pending', notes || null);

    const created = db.prepare("SELECT * FROM hr_salaries WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/salaries/:id", (req, res) => {
  try {
    const { basic_salary, bonuses, deductions, status, payment_date, notes } = req.body;
    const current = db.prepare("SELECT * FROM hr_salaries WHERE id = ?").get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: "مسير الراتب غير موجود" });

    const bSal = basic_salary !== undefined ? Number(basic_salary) : current.basic_salary;
    const bon = bonuses !== undefined ? Number(bonuses) : current.bonuses;
    const ded = deductions !== undefined ? Number(deductions) : current.deductions;
    const net = bSal + bon - ded;

    db.prepare(`
      UPDATE hr_salaries
      SET basic_salary = ?, bonuses = ?, deductions = ?, net_salary = ?, status = COALESCE(?, status),
          payment_date = COALESCE(?, payment_date), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(bSal, bon, ded, net, status || null, payment_date || null, notes || null, req.params.id);

    const updated = db.prepare("SELECT * FROM hr_salaries WHERE id = ?").get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/salaries/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_salaries WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ATTENDANCE ====================
router.get("/hr/attendance", (req, res) => {
  try {
    const { date, month, employee_id } = req.query;
    let sql = `
      SELECT a.*, e.name as employee_name, e.employee_number, d.name as department_name
      FROM hr_attendance a
      JOIN hr_employees e ON e.id = a.employee_id
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (date) {
      sql += " AND a.date = ?";
      params.push(date);
    }
    if (month) {
      sql += " AND a.date LIKE ?";
      params.push(`${month}%`);
    }
    if (employee_id) {
      sql += " AND a.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY a.date DESC, e.name ASC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/attendance", (req, res) => {
  try {
    const { employee_id, date, check_in, check_out, status, notes } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_attendance (employee_id, date, check_in, check_out, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), date, check_in || null, check_out || null, status || 'present', notes || null);
    const created = db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(r.lastInsertRowid);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/attendance/:id", (req, res) => {
  try {
    const { check_in, check_out, status, notes } = req.body;
    db.prepare(`
      UPDATE hr_attendance
      SET check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out),
          status = COALESCE(?, status), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(check_in || null, check_out || null, status || null, notes || null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_attendance WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/attendance/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_attendance WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LOANS ====================
router.get("/hr/loans", (req, res) => {
  try {
    const { employee_id } = req.query;
    let sql = `
      SELECT l.*, e.name as employee_name, e.employee_number
      FROM hr_loans l
      JOIN hr_employees e ON e.id = l.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) {
      sql += " AND l.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY l.request_date DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/loans", (req, res) => {
  try {
    const { employee_id, amount, type, request_date, status, repayment_terms, notes } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_loans (employee_id, amount, type, request_date, status, repayment_terms, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), Number(amount) || 0, type || 'loan', request_date || new Date().toISOString().slice(0, 10), status || 'approved', repayment_terms || null, notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_loans WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/loans/:id", (req, res) => {
  try {
    const { amount, type, request_date, status, repayment_terms, notes } = req.body;
    db.prepare(`
      UPDATE hr_loans
      SET amount = COALESCE(?, amount), type = COALESCE(?, type), request_date = COALESCE(?, request_date),
          status = COALESCE(?, status), repayment_terms = COALESCE(?, repayment_terms), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(amount !== undefined ? Number(amount) : null, type || null, request_date || null, status || null, repayment_terms || null, notes || null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_loans WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/loans/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_loans WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CUSTODIES ====================
router.get("/hr/custodies", (req, res) => {
  try {
    const { employee_id } = req.query;
    let sql = `
      SELECT c.*, e.name as employee_name, e.employee_number
      FROM hr_custodies c
      JOIN hr_employees e ON e.id = c.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) {
      sql += " AND c.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY c.received_date DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/custodies", (req, res) => {
  try {
    const { employee_id, item_name, received_date, returned_date, status, notes } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_custodies (employee_id, item_name, received_date, returned_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), item_name, received_date || new Date().toISOString().slice(0, 10), returned_date || null, status || 'held', notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_custodies WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/custodies/:id", (req, res) => {
  try {
    const { item_name, received_date, returned_date, status, notes } = req.body;
    db.prepare(`
      UPDATE hr_custodies
      SET item_name = COALESCE(?, item_name), received_date = COALESCE(?, received_date),
          returned_date = ?, status = COALESCE(?, status), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(item_name || null, received_date || null, returned_date || null, status || null, notes || null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_custodies WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/custodies/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_custodies WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== LEAVES ====================
router.get("/hr/leaves", (req, res) => {
  try {
    const { employee_id } = req.query;
    let sql = `
      SELECT l.*, e.name as employee_name, e.employee_number
      FROM hr_leaves l
      JOIN hr_employees e ON e.id = l.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) {
      sql += " AND l.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY l.start_date DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/leaves", (req, res) => {
  try {
    const { employee_id, start_date, end_date, type, status, notes } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_leaves (employee_id, start_date, end_date, type, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), start_date, end_date, type || 'annual', status || 'approved', notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_leaves WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/leaves/:id", (req, res) => {
  try {
    const { start_date, end_date, type, status, notes } = req.body;
    db.prepare(`
      UPDATE hr_leaves
      SET start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date),
          type = COALESCE(?, type), status = COALESCE(?, status), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(start_date || null, end_date || null, type || null, status || null, notes || null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_leaves WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/leaves/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_leaves WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PENALTIES ====================
router.get("/hr/penalties", (req, res) => {
  try {
    const { employee_id } = req.query;
    let sql = `
      SELECT p.*, e.name as employee_name, e.employee_number
      FROM hr_penalties p
      JOIN hr_employees e ON e.id = p.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) {
      sql += " AND p.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY p.date DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/penalties", (req, res) => {
  try {
    const { employee_id, violation_name, amount, date, notes } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_penalties (employee_id, violation_name, amount, date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(Number(employee_id), violation_name, Number(amount) || 0, date || new Date().toISOString().slice(0, 10), notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_penalties WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/penalties/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_penalties WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== OVERTIME ====================
router.get("/hr/overtime", (req, res) => {
  try {
    const { employee_id } = req.query;
    let sql = `
      SELECT o.*, e.name as employee_name, e.employee_number
      FROM hr_overtime o
      JOIN hr_employees e ON e.id = o.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) {
      sql += " AND o.employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY o.date DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/overtime", (req, res) => {
  try {
    const { employee_id, hours, rate, total_amount, date, notes } = req.body;
    const hrs = Number(hours) || 0;
    const rt = Number(rate) || 0;
    const tot = total_amount !== undefined ? Number(total_amount) : (hrs * rt);
    const r = db.prepare(`
      INSERT INTO hr_overtime (employee_id, hours, rate, total_amount, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(employee_id), hrs, rt, tot, date || new Date().toISOString().slice(0, 10), notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_overtime WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/overtime/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_overtime WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TOOLS & MOVEMENTS ====================
router.get("/hr/tools", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM hr_tools ORDER BY name").all());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/tools", (req, res) => {
  try {
    const { name, serial_number, quantity, available_qty, notes } = req.body;
    const qty = Number(quantity) || 1;
    const avail = available_qty !== undefined ? Number(available_qty) : qty;
    const r = db.prepare(`
      INSERT INTO hr_tools (name, serial_number, quantity, available_qty, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, serial_number || null, qty, avail, notes || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_tools WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/tools/:id", (req, res) => {
  try {
    const { name, serial_number, quantity, available_qty, notes } = req.body;
    db.prepare(`
      UPDATE hr_tools
      SET name = COALESCE(?, name), serial_number = COALESCE(?, serial_number),
          quantity = COALESCE(?, quantity), available_qty = COALESCE(?, available_qty), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(name || null, serial_number || null, quantity !== undefined ? Number(quantity) : null, available_qty !== undefined ? Number(available_qty) : null, notes || null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_tools WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/tools/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_tools WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/hr/tools/movements", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT m.*, t.name as tool_name, t.serial_number, e.name as employee_name, e.employee_number
      FROM hr_tools_movements m
      JOIN hr_tools t ON t.id = m.tool_id
      JOIN hr_employees e ON e.id = m.employee_id
      ORDER BY m.date DESC
    `).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/tools/movements", (req, res) => {
  try {
    const { tool_id, employee_id, type, quantity, date, notes } = req.body;
    const qty = Number(quantity) || 1;
    const r = db.prepare(`
      INSERT INTO hr_tools_movements (tool_id, employee_id, type, quantity, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(tool_id), Number(employee_id), type || 'out', qty, date || new Date().toISOString().slice(0, 10), notes || null);

    // Update tool available qty
    if (type === 'out') {
      db.prepare("UPDATE hr_tools SET available_qty = MAX(0, available_qty - ?) WHERE id = ?").run(qty, Number(tool_id));
    } else {
      db.prepare("UPDATE hr_tools SET available_qty = available_qty + ? WHERE id = ?").run(qty, Number(tool_id));
    }

    res.status(201).json(db.prepare("SELECT * FROM hr_tools_movements WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TEMP EMPLOYEES ====================
router.get("/hr/temp-employees", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM hr_temp_employees ORDER BY name").all());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/temp-employees", (req, res) => {
  try {
    const { name, phone, position, daily_rate, hire_date, active } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_temp_employees (name, phone, position, daily_rate, hire_date, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, phone || null, position || 'موظف مؤقت', Number(daily_rate) || 0, hire_date || new Date().toISOString().slice(0, 10), active !== undefined ? (active ? 1 : 0) : 1);
    res.status(201).json(db.prepare("SELECT * FROM hr_temp_employees WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/hr/temp-employees/:id", (req, res) => {
  try {
    const { name, phone, position, daily_rate, hire_date, active } = req.body;
    db.prepare(`
      UPDATE hr_temp_employees
      SET name = COALESCE(?, name), phone = COALESCE(?, phone), position = COALESCE(?, position),
          daily_rate = COALESCE(?, daily_rate), hire_date = COALESCE(?, hire_date), active = COALESCE(?, active)
      WHERE id = ?
    `).run(name || null, phone || null, position || null, daily_rate !== undefined ? Number(daily_rate) : null, hire_date || null, active !== undefined ? (active ? 1 : 0) : null, req.params.id);
    res.json(db.prepare("SELECT * FROM hr_temp_employees WHERE id = ?").get(req.params.id));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/temp-employees/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_temp_employees WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== NOTES ====================
router.get("/hr/notes", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT n.*, d.name as department_name
      FROM hr_notes n
      LEFT JOIN hr_departments d ON d.id = n.department_id
      ORDER BY n.created_at DESC
    `).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/notes", (req, res) => {
  try {
    const { department_id, title, content } = req.body;
    const r = db.prepare(`
      INSERT INTO hr_notes (department_id, title, content)
      VALUES (?, ?, ?)
    `).run(department_id ? Number(department_id) : null, title, content || null);
    res.status(201).json(db.prepare("SELECT * FROM hr_notes WHERE id = ?").get(r.lastInsertRowid));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/hr/notes/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM hr_notes WHERE id = ?").run(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MEAL DEDUCTIONS ====================
router.get("/hr/meal-deductions", (req, res) => {
  try {
    const { month, employee_id } = req.query;
    let sql = "SELECT * FROM meal_deductions WHERE 1=1";
    const params: any[] = [];
    if (month) {
      sql += " AND created_at LIKE ?";
      params.push(`${month}%`);
    }
    if (employee_id) {
      sql += " AND employee_id = ?";
      params.push(employee_id);
    }
    sql += " ORDER BY created_at DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MONTHLY CLOSE ====================
router.post("/hr/monthly-close/preview", (req, res) => {
  try {
    const { month } = req.body;
    const employees = db.prepare("SELECT * FROM hr_employees WHERE active = 1").all() as any[];
    const result = employees.map(emp => {
      const basic = emp.basic_salary || 0;
      const overtime = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as s FROM hr_overtime WHERE employee_id = ? AND date LIKE ?").get(emp.id, `${month}%`) as any).s;
      const penalties = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM hr_penalties WHERE employee_id = ? AND date LIKE ?").get(emp.id, `${month}%`) as any).s;
      const loans = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM hr_loans WHERE employee_id = ? AND request_date LIKE ? AND status = 'approved'").get(emp.id, `${month}%`) as any).s;
      const meals = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM meal_deductions WHERE employee_id = ? AND created_at LIKE ?").get(emp.id, `${month}%`) as any).s;
      
      const deductions = penalties + loans + meals;
      const net = basic + overtime - deductions;
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        employee_number: emp.employee_number,
        basic_salary: basic,
        bonuses: overtime,
        deductions,
        net_salary: net,
        month
      };
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/hr/monthly-close", (req, res) => {
  try {
    const { month } = req.body;
    const employees = db.prepare("SELECT * FROM hr_employees WHERE active = 1").all() as any[];
    for (const emp of employees) {
      const basic = emp.basic_salary || 0;
      const overtime = (db.prepare("SELECT COALESCE(SUM(total_amount), 0) as s FROM hr_overtime WHERE employee_id = ? AND date LIKE ?").get(emp.id, `${month}%`) as any).s;
      const penalties = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM hr_penalties WHERE employee_id = ? AND date LIKE ?").get(emp.id, `${month}%`) as any).s;
      const loans = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM hr_loans WHERE employee_id = ? AND request_date LIKE ? AND status = 'approved'").get(emp.id, `${month}%`) as any).s;
      const meals = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM meal_deductions WHERE employee_id = ? AND created_at LIKE ?").get(emp.id, `${month}%`) as any).s;
      
      const deductions = penalties + loans + meals;
      const net = basic + overtime - deductions;

      const existing = db.prepare("SELECT id FROM hr_salaries WHERE employee_id = ? AND month = ?").get(emp.id, month) as any;
      if (existing) {
        db.prepare("UPDATE hr_salaries SET basic_salary = ?, bonuses = ?, deductions = ?, net_salary = ? WHERE id = ?")
          .run(basic, overtime, deductions, net, existing.id);
      } else {
        db.prepare("INSERT INTO hr_salaries (employee_id, month, basic_salary, bonuses, deductions, net_salary, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')")
          .run(emp.id, month, basic, overtime, deductions, net);
      }
    }
    res.json({ message: "تم إغلاق الرواتب وتحديث السجلات بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SUMMARY & REPORTS ====================
router.get("/hr/summary", (req, res) => {
  try {
    const totalEmployees = (db.prepare("SELECT COUNT(*) as c FROM hr_employees WHERE active = 1").get() as any).c;
    const totalDepartments = (db.prepare("SELECT COUNT(*) as c FROM hr_departments").get() as any).c;
    const totalSalariesPaid = (db.prepare("SELECT COALESCE(SUM(net_salary), 0) as s FROM hr_salaries WHERE status = 'paid'").get() as any).s;
    const pendingLoans = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM hr_loans WHERE status = 'pending'").get() as any).s;
    res.json({
      totalEmployees,
      totalDepartments,
      totalSalariesPaid,
      pendingLoans
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed Comprehensive Employee Statement Report Endpoint
router.get("/hr/reports/statement", (req, res) => {
  try {
    const { employee_id, month } = req.query;
    if (!employee_id) {
      return res.status(400).json({ error: "معرف الموظف مطلوب" });
    }

    const emp = db.prepare(`
      SELECT e.*, d.name as department_name
      FROM hr_employees e
      LEFT JOIN hr_departments d ON d.id = e.department_id
      WHERE e.id = ?
    `).get(employee_id) as any;

    if (!emp) {
      return res.status(404).json({ error: "الموظف غير موجود" });
    }

    const mQuery = month ? `${month}%` : "%";

    const overtimes = db.prepare("SELECT * FROM hr_overtime WHERE employee_id = ? AND date LIKE ?").all(employee_id, mQuery) as any[];
    const overtimeTotal = overtimes.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const entitlements = db.prepare("SELECT * FROM hr_entitlements WHERE employee_id = ? AND date LIKE ?").all(employee_id, mQuery) as any[];
    const entitlementsTotal = entitlements.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const penalties = db.prepare("SELECT * FROM hr_penalties WHERE employee_id = ? AND date LIKE ?").all(employee_id, mQuery) as any[];
    const penaltiesTotal = penalties.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const loans = db.prepare("SELECT * FROM hr_loans WHERE employee_id = ? AND request_date LIKE ?").all(employee_id, mQuery) as any[];
    const loansTotal = loans.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    const meals = db.prepare("SELECT * FROM meal_deductions WHERE employee_id = ? AND created_at LIKE ?").all(employee_id, mQuery) as any[];
    const mealsTotal = meals.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const attendances = db.prepare("SELECT * FROM hr_attendance WHERE employee_id = ? AND date LIKE ?").all(employee_id, mQuery) as any[];
    let absencesTotal = 0;
    let latesTotal = 0;
    const dailyRate = (emp.basic_salary || 0) / 30;

    attendances.forEach(a => {
      if (a.status === 'absent') {
        absencesTotal += dailyRate;
      } else if (a.status === 'late') {
        latesTotal += dailyRate * 0.25;
      }
    });

    const basicSalary = Number(emp.basic_salary) || 0;
    const totalEntitlements = basicSalary + overtimeTotal + entitlementsTotal;
    const totalDeductions = penaltiesTotal + loansTotal + mealsTotal + absencesTotal + latesTotal;
    const netSalary = totalEntitlements - totalDeductions;

    res.json({
      employee: emp,
      month: month || "شامل",
      basicSalary,
      overtimes,
      overtimeTotal,
      entitlements,
      entitlementsTotal,
      penalties,
      penaltiesTotal,
      loans,
      loansTotal,
      meals,
      mealsTotal,
      absencesTotal,
      latesTotal,
      totalEntitlements,
      totalDeductions,
      netSalary
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

