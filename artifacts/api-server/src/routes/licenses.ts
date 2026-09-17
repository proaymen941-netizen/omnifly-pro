import { Router } from "express";
import { db, logAudit } from "../lib/sqlite";
import { getAuthUser, checkLicenseStatus, getSystemDeviceId, CURRENT_SYSTEM_VERSION } from "./auth";
import crypto from "node:crypto";
import os from "node:os";

const router = Router();
const DEV_SIGNING_SALT = "OMNIFLY-PRO-ENTERPRISE-DEVELOPER-SECRET-KEY-2027";

export function generateActivationCode(deviceId: string, expiresAt: string, version: string = CURRENT_SYSTEM_VERSION): string {
  const cleanDevice = String(deviceId || "").trim().toUpperCase();
  const cleanExp = String(expiresAt || "").trim();
  const cleanVer = String(version || CURRENT_SYSTEM_VERSION).trim();
  const payload = `${cleanDevice}|${cleanExp}|${cleanVer}`;
  const sig = crypto.createHmac("sha256", DEV_SIGNING_SALT).update(payload).digest("hex").toUpperCase();
  return `ACT-${sig.substring(0, 4)}-${sig.substring(4, 8)}-${sig.substring(8, 12)}`;
}

export function verifyActivationCode(activationCode: string, deviceId: string, expiresAt: string, version: string = CURRENT_SYSTEM_VERSION): boolean {
  const cleanCode = String(activationCode || "").trim().toUpperCase();
  const expected = generateActivationCode(deviceId, expiresAt, version);
  return cleanCode === expected;
}

function requireDeveloper(req: any, res: any): boolean {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "تسجيل الدخول مطلوب" });
    return false;
  }
  const isDev = user.role === "developer" || user.username?.toLowerCase() === "developer";
  if (!isDev) {
    res.status(403).json({ error: "هذه الصفحة والعمليات مخصصة لحساب المطور فقط" });
    return false;
  }
  return true;
}

// Public license and device verification status endpoint
router.get("/license/status", (req, res) => {
  const status = checkLicenseStatus();
  res.json(status);
});

// Returns hardware device info for current machine
router.get("/licenses/device-info", (req, res) => {
  const deviceId = getSystemDeviceId();
  res.json({
    deviceId,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    currentVersion: CURRENT_SYSTEM_VERSION
  });
});

// Active license information
router.get("/licenses/active", (req, res) => {
  const lic = db.prepare("SELECT * FROM licenses WHERE active=1 AND (status IS NULL OR status='active') ORDER BY id DESC LIMIT 1").get() as any;
  if (!lic) {
    res.json({ active: false, client_name: "غير مرخص / موقوف", expires_at: "", devices_limit: 0, current_device_id: getSystemDeviceId() });
    return;
  }
  const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=? ORDER BY id DESC").all(lic.id);
  res.json({ ...lic, devices, current_device_id: getSystemDeviceId(), current_version: CURRENT_SYSTEM_VERSION });
});

// Developer: List all licenses with their authorized devices
router.get("/licenses", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const licenses = db.prepare("SELECT * FROM licenses ORDER BY id DESC").all() as any[];
  const currentDeviceId = getSystemDeviceId();
  const result = licenses.map(lic => {
    const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=? ORDER BY id DESC").all(lic.id);
    return { 
      ...lic, 
      devices, 
      active_devices_count: devices.filter((d: any) => d.status === 'authorized' || !d.status).length,
      current_device_id: currentDeviceId
    };
  });
  res.json(result);
});

// Developer: Issue new license
router.post("/licenses", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  const userId = user?.id ?? 1;
  const userName = user?.name ?? "مطور النظام";
  const { client_name, devices_limit, expires_at, target_version, license_type, notes } = req.body;
  const licType = license_type || "cloud";
  const licenseKey = `OMNI-${licType.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const version = target_version || CURRENT_SYSTEM_VERSION;
  
  const r = db.prepare(`
    INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version, license_type, notes) 
    VALUES (?,?,?,?,1,'active',?,?,?)
  `).run(licenseKey, client_name ?? "شركة أومني لسفريات والسياحة", devices_limit ?? (licType === "cloud" ? 999 : 5), expires_at ?? "2027-12-31", version, licType, notes ?? "");

  logAudit(userId, userName, "إصدار ترخيص", `ترخيص ${licType === "cloud" ? "سحابي شامل" : "أجهزة مكتبية"} لـ ${client_name ?? "عميل جديد"} برقم ${licenseKey} (إصدار: ${version})`);
  
  res.status(201).json({ 
    id: r.lastInsertRowid, 
    license_key: licenseKey, 
    client_name, 
    devices_limit: devices_limit ?? (licType === "cloud" ? 999 : 5), 
    expires_at: expires_at ?? "2027-12-31", 
    active: 1, 
    status: "active",
    target_version: version,
    license_type: licType,
    notes
  });
});

// Developer: Quick Remote Cloud License Activation / Extension (1-Click Remote Cloud Activation)
router.post("/licenses/activate-cloud-license", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const { client_name, duration_months, custom_expires_at, target_version, notes } = req.body;

  let finalExpiresAt = custom_expires_at;
  if (!finalExpiresAt) {
    const months = Number(duration_months) || 12;
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    finalExpiresAt = date.toISOString().split("T")[0];
  }

  const ver = target_version || CURRENT_SYSTEM_VERSION;
  const cName = client_name || "مؤسسة إتقان المعتمدة للتجارة والخدمات";

  // Check if there's an existing license to update, or create a fresh cloud master license
  let lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get() as any;
  if (!lic) {
    const newKey = `OMNI-CLOUD-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const r = db.prepare(`
      INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version, license_type, notes)
      VALUES (?, ?, 999, ?, 1, 'active', ?, 'cloud', ?)
    `).run(newKey, cName, finalExpiresAt, ver, notes || "ترخيص سحابي شامل تم تفعيله عن بُعد من قبل المطور");
    lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(r.lastInsertRowid);
  } else {
    db.prepare(`
      UPDATE licenses 
      SET expires_at=?, active=1, status='active', target_version=?, license_type='cloud', client_name=COALESCE(?, client_name)
      WHERE id=?
    `).run(finalExpiresAt, ver, cName, lic.id);
    lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(lic.id);
  }

  logAudit(user.id, user.name, "تفعيل ترخيص سحابي عن بعد", `تم تفعيل وتمديد الترخيص السحابي حتى (${finalExpiresAt}) بنجاح`);

  res.json({
    success: true,
    message: `تم اعتماد وتفعيل الترخيص السحابي الشامل للنظام حتى تاريخ (${finalExpiresAt}) بنجاح! يسمح لجميع المستخدمين والموظفين بالدخول الفوري.`,
    license: lic
  });
});

// Developer: Authorize Current Device with 1-Click
router.post("/licenses/authorize-current", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const { license_id, device_name } = req.body;

  let lic: any;
  if (license_id) {
    lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(license_id);
  } else {
    lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get();
  }

  if (!lic) {
    res.status(404).json({ error: "لا يوجد ترخيص نشط متاح لربط الجهاز به" });
    return;
  }

  const currentDeviceId = getSystemDeviceId();
  const devName = device_name || `جهاز معتمد (${os.hostname()})`;

  const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDeviceId) as any;
  if (existing) {
    db.prepare("UPDATE license_devices SET status='authorized', device_name=?, authorized_by=?, last_active=datetime('now', 'localtime') WHERE id=?")
      .run(devName, `المطور: ${user.name}`, existing.id);
  } else {
    // Check device limit
    const count = (db.prepare("SELECT COUNT(*) as c FROM license_devices WHERE license_id=?").get(lic.id) as any).c;
    if (count >= lic.devices_limit) {
      // Auto-expand limit by 1 or return
      db.prepare("UPDATE licenses SET devices_limit = devices_limit + 1 WHERE id=?").run(lic.id);
    }
    db.prepare(`
      INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
      VALUES (?, ?, ?, ?, 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
    `).run(lic.id, currentDeviceId, devName, `المطور: ${user.name}`);
  }

  logAudit(user.id, user.name, "ترخيص جهاز", `تم ترخيص الجهاز الحالي (${currentDeviceId}) للترخيص ${lic.license_key}`);
  
  res.json({
    success: true,
    message: `تم ترخيص وتفعيل الجهاز الحالي (${currentDeviceId}) بنجاح!`,
    deviceId: currentDeviceId,
    licenseId: lic.id
  });
});

// Developer: Manually authorize a specific Device ID
router.post("/licenses/authorize-device", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const { license_id, device_id, device_name } = req.body;

  if (!device_id || !license_id) {
    res.status(400).json({ error: "يرجى تحديد رقم الترخيص وبصمة الجهاز المراد ترخيصه" });
    return;
  }

  const lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(license_id) as any;
  if (!lic) {
    res.status(404).json({ error: "الترخيص غير موجود" });
    return;
  }

  const cleanDeviceId = String(device_id).trim().toUpperCase();
  const devName = device_name || `جهاز محطة عمل (${cleanDeviceId})`;

  const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, cleanDeviceId) as any;
  if (existing) {
    db.prepare("UPDATE license_devices SET status='authorized', device_name=?, authorized_by=?, last_active=datetime('now', 'localtime') WHERE id=?")
      .run(devName, `المطور: ${user.name}`, existing.id);
  } else {
    db.prepare(`
      INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
      VALUES (?, ?, ?, ?, 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
    `).run(lic.id, cleanDeviceId, devName, `المطور: ${user.name}`);
  }

  logAudit(user.id, user.name, "ترخيص جهاز يدوي", `تم ترخيص بصمة الجهاز (${cleanDeviceId}) باسم (${devName})`);
  
  const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=? ORDER BY id DESC").all(lic.id);
  res.json({ success: true, message: "تم ترخيص الجهاز بنجاح", devices });
});

// Developer: Generate an Offline Activation Code
router.post("/licenses/generate-code", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const { device_id, expires_at, target_version } = req.body;
  if (!device_id || !expires_at) {
    res.status(400).json({ error: "يرجى تحديد بصمة الجهاز وتاريخ الانتهاء" });
    return;
  }
  const version = target_version || CURRENT_SYSTEM_VERSION;
  const code = generateActivationCode(device_id, expires_at, version);
  res.json({
    deviceId: device_id.trim().toUpperCase(),
    expiresAt: expires_at.trim(),
    targetVersion: version,
    activationCode: code
  });
});

// Public / Login Screen: Activate Device directly with Activation Code or License Key
router.post("/licenses/activate-with-code", (req, res) => {
  const { device_id, activation_code, expires_at, target_version, device_name, client_name } = req.body;
  const currentDev = (device_id || getSystemDeviceId()).trim().toUpperCase();

  if (!activation_code) {
    res.status(400).json({ error: "يرجى إدخال كود التفعيل" });
    return;
  }

  // 1. Try cryptographic offline code verification
  const exp = expires_at || "2027-12-31";
  const ver = target_version || CURRENT_SYSTEM_VERSION;
  const isValidCode = verifyActivationCode(activation_code, currentDev, exp, ver) ||
                      verifyActivationCode(activation_code, currentDev, exp, "*") ||
                      verifyActivationCode(activation_code, currentDev, "2027-12-31", CURRENT_SYSTEM_VERSION);

  if (isValidCode) {
    let lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get() as any;
    if (!lic) {
      const newKey = `OMNI-ACTIVATED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const r = db.prepare(`
        INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version)
        VALUES (?, ?, 10, ?, 1, 'active', ?)
      `).run(newKey, client_name || "عميل مرخص", exp, ver);
      lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(r.lastInsertRowid);
    } else {
      // Update license if needed
      db.prepare("UPDATE licenses SET expires_at=?, target_version=?, active=1, status='active' WHERE id=?").run(exp, ver, lic.id);
    }

    // Register the device
    const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDev) as any;
    if (existing) {
      db.prepare("UPDATE license_devices SET status='authorized', authorized_by='كود تفعيل رقمي معتمد', last_active=datetime('now', 'localtime') WHERE id=?").run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, 'كود تفعيل رقمي معتمد', 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(lic.id, currentDev, device_name || `جهاز مفعل (${os.hostname()})`);
    }

    res.json({
      success: true,
      message: "تم تفعيل وترخيص هذا الجهاز بنجاح! يمكنك الآن تسجيل الدخول للنظام.",
      deviceId: currentDev,
      expiresAt: exp
    });
    return;
  }

  // 2. Try license_key lookup
  const licByKey = db.prepare("SELECT * FROM licenses WHERE license_key=? AND active=1 AND (status IS NULL OR status='active')").get(activation_code.trim()) as any;
  if (licByKey) {
    if (new Date(licByKey.expires_at) < new Date()) {
      res.status(400).json({ error: "مفتاح الترخيص منتهي الصلاحية" });
      return;
    }
    const devCount = (db.prepare("SELECT COUNT(*) as c FROM license_devices WHERE license_id=? AND (status IS NULL OR status='authorized')").get(licByKey.id) as any).c;
    if (devCount >= (licByKey.devices_limit || 10)) {
      res.status(400).json({ error: `تم استنفاد الحد الأقصى للأجهزة المرخصة لهذا المفتاح (${devCount}/${licByKey.devices_limit})` });
      return;
    }
    const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(licByKey.id, currentDev) as any;
    if (existing) {
      db.prepare("UPDATE license_devices SET status='authorized', last_active=datetime('now', 'localtime') WHERE id=?").run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, 'مفتاح ترخيص مباشر', 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(licByKey.id, currentDev, device_name || `جهاز (${os.hostname()})`);
    }
    res.json({
      success: true,
      message: "تم تفعيل الجهاز بنجاح باستخدام مفتاح الترخيص!",
      deviceId: currentDev,
      expiresAt: licByKey.expires_at
    });
    return;
  }

  res.status(400).json({
    error: "كود التفعيل أو مفتاح الترخيص غير صالح لهذه البصمة. يرجى التأكد من الكود الممنوح من المطور."
  });
});

// Developer: Approve and upgrade all active licenses to the latest system release version
router.post("/licenses/upgrade-all-to-version", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const version = req.body.version || CURRENT_SYSTEM_VERSION;

  db.prepare("UPDATE licenses SET target_version=? WHERE active=1").run(version);
  logAudit(user.id, user.name, "اعتماد ترخيص إصدار النظام", `تم اعتماد الإصدار (${version}) لجميع التراخيص النشطة`);

  res.json({
    success: true,
    message: `تم اعتماد وترخيص تشغيل الإصدار الجديد (v${version}) بنجاح!`,
    version
  });
});

// Developer: Toggle device authorization / block status
router.patch("/licenses/devices/:id/toggle", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const dev = db.prepare("SELECT * FROM license_devices WHERE id=?").get(req.params.id) as any;
  if (!dev) {
    res.status(404).json({ error: "الجهاز غير موجود" });
    return;
  }
  const newStatus = dev.status === 'blocked' ? 'authorized' : 'blocked';
  db.prepare("UPDATE license_devices SET status=? WHERE id=?").run(newStatus, dev.id);
  logAudit(user.id, user.name, "تغيير حالة جهاز", `تم تغيير حالة الجهاز (${dev.device_id}) إلى ${newStatus === 'blocked' ? 'محظور' : 'مرخص'}`);
  
  res.json({ success: true, id: dev.id, status: newStatus });
});

// Developer: Update License details
router.patch("/licenses/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  const userId = user?.id ?? 1;
  const userName = user?.name ?? "مطور النظام";
  const { status, active, expires_at, expire_date, client_name, devices_limit, target_version, license_type, notes } = req.body;
  const lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(req.params.id) as any;
  if (!lic) {
    res.status(404).json({ error: "الترخيص غير موجود" });
    return;
  }

  const finalExpiresAt = expires_at ?? expire_date ?? lic.expires_at;
  const finalStatus = status !== undefined ? status : (lic.status || "active");
  const finalActive = active !== undefined ? (active ? 1 : 0) : (finalStatus === "suspended" ? 0 : 1);
  const finalClientName = client_name ?? lic.client_name;
  const finalDevicesLimit = devices_limit !== undefined ? Number(devices_limit) : lic.devices_limit;
  const finalVersion = target_version !== undefined ? target_version : (lic.target_version || CURRENT_SYSTEM_VERSION);
  const finalLicType = license_type !== undefined ? license_type : (lic.license_type || "cloud");
  const finalNotes = notes !== undefined ? notes : lic.notes;

  db.prepare(`
    UPDATE licenses 
    SET client_name=?, devices_limit=?, expires_at=?, active=?, status=?, target_version=?, license_type=?, notes=?
    WHERE id=?
  `).run(finalClientName, finalDevicesLimit, finalExpiresAt, finalActive, finalStatus, finalVersion, finalLicType, finalNotes, req.params.id);

  logAudit(userId, userName, "تعديل ترخيص", `تم تحديث الترخيص رقم ${req.params.id} (${lic.license_key}) - الحالة: ${finalStatus}, الإصدار: ${finalVersion}, النوع: ${finalLicType}`);

  const updated = db.prepare("SELECT * FROM licenses WHERE id=?").get(req.params.id) as any;
  const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=? ORDER BY id DESC").all(updated.id);
  res.json({ ...updated, devices, active_devices_count: devices.length });
});

router.put("/licenses/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req);
  const userId = user?.id ?? 1;
  const userName = user?.name ?? "مطور النظام";
  const { status, active, expires_at, expire_date, client_name, devices_limit, target_version, license_type, notes } = req.body;
  const lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(req.params.id) as any;
  if (!lic) {
    res.status(404).json({ error: "الترخيص غير موجود" });
    return;
  }

  const finalExpiresAt = expires_at ?? expire_date ?? lic.expires_at;
  const finalStatus = status !== undefined ? status : (lic.status || "active");
  const finalActive = active !== undefined ? (active ? 1 : 0) : (finalStatus === "suspended" ? 0 : 1);
  const finalClientName = client_name ?? lic.client_name;
  const finalDevicesLimit = devices_limit !== undefined ? Number(devices_limit) : lic.devices_limit;
  const finalVersion = target_version !== undefined ? target_version : (lic.target_version || CURRENT_SYSTEM_VERSION);
  const finalLicType = license_type !== undefined ? license_type : (lic.license_type || "cloud");
  const finalNotes = notes !== undefined ? notes : lic.notes;

  db.prepare(`
    UPDATE licenses 
    SET client_name=?, devices_limit=?, expires_at=?, active=?, status=?, target_version=?, license_type=?, notes=?
    WHERE id=?
  `).run(finalClientName, finalDevicesLimit, finalExpiresAt, finalActive, finalStatus, finalVersion, finalLicType, finalNotes, req.params.id);

  logAudit(userId, userName, "تعديل ترخيص", `تم تحديث الترخيص رقم ${req.params.id} (${lic.license_key}) - الحالة: ${finalStatus}`);

  const updated = db.prepare("SELECT * FROM licenses WHERE id=?").get(req.params.id) as any;
  const devices = db.prepare("SELECT * FROM license_devices WHERE license_id=? ORDER BY id DESC").all(updated.id);
  res.json({ ...updated, devices, active_devices_count: devices.length });
});

// Developer: Remove device from license
router.delete("/licenses/devices/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const dev = db.prepare("SELECT * FROM license_devices WHERE id=?").get(req.params.id) as any;
  db.prepare("DELETE FROM license_devices WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "إلغاء ربط جهاز", `تم إزالة الجهاز (${dev?.device_id || req.params.id})`);
  res.status(204).send();
});

// Developer: Delete license
router.delete("/licenses/:id", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  db.prepare("DELETE FROM license_devices WHERE license_id=?").run(req.params.id);
  db.prepare("DELETE FROM licenses WHERE id=?").run(req.params.id);
  logAudit(user.id, user.name, "حذف ترخيص", `تم حذف الترخيص رقم ${req.params.id}`);
  res.status(204).send();
});

export default router;
