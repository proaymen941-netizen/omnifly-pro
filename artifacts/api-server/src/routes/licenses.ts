import { Router } from "express";
import { db, logAudit } from "../lib/sqlite";
import { getAuthUser, checkLicenseStatus, getSystemDeviceId, CURRENT_SYSTEM_VERSION } from "./auth";
import crypto from "node:crypto";
import os from "node:os";

const router = Router();
const DEV_SIGNING_SALT = "OMNIFLY-PRO-ENTERPRISE-DEVELOPER-SECRET-KEY-2027";
const AES_KEY = crypto.createHash("sha256").update(DEV_SIGNING_SALT).digest();

export interface LicensePayload {
  hwid: string;
  client: string;
  exp: string;
  limit: number;
  type: "desktop" | "cloud";
  ver: string;
  notes?: string;
  ts?: number;
}

export function encryptLicenseToken(payload: Partial<LicensePayload>): string {
  const cleanPayload: LicensePayload = {
    hwid: String(payload.hwid || "*").trim().toUpperCase(),
    client: String(payload.client || "شركة أومني لسفريات والسياحة").trim(),
    exp: String(payload.exp || "2027-12-31").trim(),
    limit: Math.max(1, Number(payload.limit) || 1),
    type: payload.type === "cloud" ? "cloud" : "desktop",
    ver: String(payload.ver || CURRENT_SYSTEM_VERSION).trim(),
    notes: payload.notes || "",
    ts: Math.floor(Date.now() / 1000)
  };

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv);
  const jsonStr = JSON.stringify(cleanPayload);
  let encrypted = cipher.update(jsonStr, "utf8", "base64url");
  encrypted += cipher.final("base64url");
  const tag = cipher.getAuthTag().toString("base64url");
  return `ACT-LIC-${iv.toString("base64url")}-${tag}-${encrypted}`;
}

export function decryptLicenseToken(token: string): LicensePayload | null {
  if (!token || typeof token !== "string") return null;
  let cleanToken = token.trim().replace(/[\r\n\t\s]+/g, "");

  if (cleanToken.startsWith("ACT-LIC-") || cleanToken.startsWith("OMNI-LIC-") || cleanToken.startsWith("OMNI-")) {
    if (cleanToken.startsWith("ACT-LIC-") || cleanToken.startsWith("OMNI-LIC-")) {
      cleanToken = cleanToken.substring(8);
    } else if (cleanToken.startsWith("OMNI-")) {
      cleanToken = cleanToken.substring(5);
    }
  }

  const parts = cleanToken.split("-");
  if (parts.length < 3) return null;

  try {
    const iv = Buffer.from(parts[0], "base64url");
    const tag = Buffer.from(parts[1], "base64url");
    const ciphertext = parts.slice(2).join("-");
    const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, "base64url", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted) as LicensePayload;
  } catch (e) {
    return null;
  }
}

export function generateActivationCode(deviceId: string, expiresAt: string, version: string = CURRENT_SYSTEM_VERSION, devicesLimit: number = 1): string {
  return encryptLicenseToken({
    hwid: deviceId,
    exp: expiresAt,
    ver: version,
    limit: devicesLimit,
    type: "desktop"
  });
}

export function verifyActivationCode(activationCode: string, deviceId: string, expiresAt: string, version: string = CURRENT_SYSTEM_VERSION, devicesLimit: number = 1): boolean {
  const decrypted = decryptLicenseToken(activationCode);
  if (decrypted) {
    const targetHwid = decrypted.hwid.toUpperCase();
    const currentHwid = String(deviceId || "").trim().toUpperCase();
    return targetHwid === "*" || targetHwid === currentHwid;
  }

  // Legacy signature verification
  const cleanCode = String(activationCode || "").trim().toUpperCase();
  const cleanDevice = String(deviceId || "").trim().toUpperCase();
  const cleanExp = String(expiresAt || "").trim();
  const cleanVer = String(version || CURRENT_SYSTEM_VERSION).trim();
  const cleanLimit = String(devicesLimit || 1).trim();

  const payload = `${cleanDevice}|${cleanExp}|${cleanVer}|${cleanLimit}`;
  const sig = crypto.createHmac("sha256", DEV_SIGNING_SALT).update(payload).digest("hex").toUpperCase();
  const expected = `ACT-${sig.substring(0, 4)}-${sig.substring(4, 8)}-${sig.substring(8, 12)}-${sig.substring(12, 16)}`;
  if (cleanCode === expected) return true;

  const payloadLegacy = `${cleanDevice}|${cleanExp}|${cleanVer}`;
  const sigLegacy = crypto.createHmac("sha256", DEV_SIGNING_SALT).update(payloadLegacy).digest("hex").toUpperCase();
  const expectedLegacy = `ACT-${sigLegacy.substring(0, 4)}-${sigLegacy.substring(4, 8)}-${sigLegacy.substring(8, 12)}`;
  return cleanCode === expectedLegacy;
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

// Developer: Generate an Offline or Cloud Activation Code with complete client & device limits
router.post("/licenses/generate-code", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  const user = getAuthUser(req)!;
  const { 
    device_id, 
    client_name, 
    expires_at, 
    duration_days, 
    duration_months, 
    devices_limit, 
    license_type, 
    target_version, 
    notes,
    auto_save 
  } = req.body;

  if (!device_id) {
    res.status(400).json({ error: "يرجى إدخال بصمة الجهاز (HWID)" });
    return;
  }

  // Determine expiration date
  let finalExpiresAt = expires_at ? String(expires_at).trim() : "";
  if (!finalExpiresAt) {
    const d = new Date();
    if (duration_days) {
      d.setDate(d.getDate() + Number(duration_days));
    } else if (duration_months) {
      d.setMonth(d.getMonth() + Number(duration_months));
    } else {
      d.setFullYear(d.getFullYear() + 1); // default 1 year
    }
    finalExpiresAt = d.toISOString().split("T")[0];
  }

  const cleanDevice = String(device_id).trim().toUpperCase();
  const cleanClient = String(client_name || "شركة أومني لسفريات والسياحة").trim();
  const cleanLimit = Math.max(1, Number(devices_limit) || 1);
  const cleanType = license_type === "cloud" ? "cloud" : "desktop";
  const version = target_version || CURRENT_SYSTEM_VERSION;

  const code = encryptLicenseToken({
    hwid: cleanDevice,
    client: cleanClient,
    exp: finalExpiresAt,
    limit: cleanLimit,
    type: cleanType,
    ver: version,
    notes: notes || ""
  });

  // If auto_save requested or by default, register in licenses table so both offline signature and online key work
  let savedLicenseId: number | undefined;
  if (auto_save !== false) {
    const r = db.prepare(`
      INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version, license_type, notes)
      VALUES (?, ?, ?, ?, 1, 'active', ?, ?, ?)
    `).run(code, cleanClient, cleanLimit, finalExpiresAt, version, cleanType, notes || `تم إصدار كود تفعيل لبصمة (${cleanDevice})`);
    
    savedLicenseId = Number(r.lastInsertRowid);

    // Also pre-authorize the specified device
    try {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, ?, 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(savedLicenseId, cleanDevice, `جهاز (${cleanClient})`, `المطور: ${user.name}`);
    } catch (e) {}

    logAudit(user.id, user.name, "توليد كود ترخيص", `تم توليد كود ترخيص لـ (${cleanClient}) على البصمة (${cleanDevice}) حتى (${finalExpiresAt})`);
  }

  const shareText = `📋 *بيانات تفعيل وترخيص نظام OmniFly Pro:*\n` +
    `👤 *المنشأة/العميل:* ${cleanClient}\n` +
    `💻 *بصمة الجهاز المعتمد:* ${cleanDevice}\n` +
    `🔑 *كود التفعيل الرقمي:* ${code}\n` +
    `📅 *صلاحية الترخيص حتى:* ${finalExpiresAt}\n` +
    `🔢 *عدد الأجهزة المسموح بها:* ${cleanLimit} جهاز\n` +
    `🏢 *نوع الترخيص:* ${cleanType === "cloud" ? "سحابي شامل" : "ترخيص أجهزة مكتبية"}\n\n` +
    `*طريقة التفعيل:* افتح النظام في شاشة تسجيل الدخول، اضغط على زر (تفعيل الترخيص / إدخال كود الترخيص) وألصق الكود أعلاه واضغط (اعتماد وتفعيل).`;

  res.json({
    success: true,
    deviceId: cleanDevice,
    clientName: cleanClient,
    expiresAt: finalExpiresAt,
    devicesLimit: cleanLimit,
    licenseType: cleanType,
    targetVersion: version,
    activationCode: code,
    shareText,
    licenseId: savedLicenseId
  });
});

// Public / Login Screen: Activate Device directly with Activation Code or License Key
router.post("/licenses/activate-with-code", (req, res) => {
  const { device_id, activation_code, expires_at, target_version, device_name, client_name } = req.body;
  const currentDev = (device_id || getSystemDeviceId()).trim().toUpperCase();

  if (!activation_code || !String(activation_code).trim()) {
    res.status(400).json({ error: "يرجى إدخال كود التفعيل الممنوح لك" });
    return;
  }

  const rawCode = String(activation_code).trim().replace(/[\r\n\t\s]+/g, "");

  // 1. Primary Strategy: Decrypt self-contained encrypted license token
  const decrypted = decryptLicenseToken(rawCode);
  if (decrypted) {
    const targetHwid = String(decrypted.hwid || "*").trim().toUpperCase();
    const targetExp = String(decrypted.exp || "2027-12-31").trim();
    const targetClient = String(decrypted.client || client_name || "شركة أومني لسفريات والسياحة").trim();
    const targetLimit = Math.max(1, Number(decrypted.limit) || 1);
    const targetType = decrypted.type === "cloud" ? "cloud" : "desktop";
    const targetVer = String(decrypted.ver || CURRENT_SYSTEM_VERSION).trim();

    // Check device match
    if (targetHwid !== "*" && targetHwid !== currentDev) {
      res.status(400).json({
        error: `كود الترخيص مخصص لبصمة جهاز أخرى (${targetHwid})، ولا يطابق بصمة جهازك الحالي (${currentDev}). يرجى التأكد من طلب كود مخصص لبصمة جهازك.`
      });
      return;
    }

    // Check expiration date
    if (new Date(targetExp) < new Date()) {
      res.status(400).json({
        error: `كود الترخيص منتهي الصلاحية بتاريخ (${targetExp}). يرجى التواصل مع إدارة ومطور النظام لتجديد الترخيص.`
      });
      return;
    }

    // Auto-update or insert in local SQLite database
    let lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get() as any;
    if (!lic) {
      const r = db.prepare(`
        INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version, license_type, notes)
        VALUES (?, ?, ?, ?, 1, 'active', ?, ?, ?)
      `).run(rawCode, targetClient, targetLimit, targetExp, targetVer, targetType, decrypted.notes || "تم التفعيل بكود الترخيص الرقمي المشفر");
      lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(r.lastInsertRowid);
    } else {
      db.prepare(`
        UPDATE licenses 
        SET license_key=?, client_name=?, devices_limit=?, expires_at=?, target_version=?, license_type=?, active=1, status='active'
        WHERE id=?
      `).run(rawCode, targetClient, targetLimit, targetExp, targetVer, targetType, lic.id);
    }

    // Update settings business name if needed
    try {
      db.prepare("UPDATE settings SET business_name=? WHERE id=1").run(targetClient);
    } catch (e) {}

    // Authorize device in local license_devices table
    const existingDev = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDev) as any;
    if (existingDev) {
      db.prepare("UPDATE license_devices SET status='authorized', authorized_by='كود ترخيص مشفر معتمد', last_active=datetime('now', 'localtime') WHERE id=?").run(existingDev.id);
    } else {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, 'كود ترخيص مشفر معتمد', 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(lic.id, currentDev, device_name || `جهاز مفعل (${os.hostname()})`);
    }

    res.json({
      success: true,
      message: "ألف مبروك تم ترخيص وتفعيل النظام بنجاح! 🎉✅ قم بتسجيل الدخول للنظام باسم المستخدم: admin وكلمة السر: admin123",
      clientName: targetClient,
      expiresAt: targetExp,
      devicesLimit: targetLimit,
      licenseType: targetType,
      deviceId: currentDev,
      credentials: {
        username: "admin",
        password: "admin123"
      }
    });
    return;
  }

  // 2. Secondary Strategy: Direct Database key lookup
  const licByKey = db.prepare(`
    SELECT * FROM licenses 
    WHERE (license_key=? OR license_key=?) 
      AND active=1 
      AND (status IS NULL OR status='active')
    ORDER BY id DESC LIMIT 1
  `).get(rawCode, rawCode.toUpperCase()) as any;

  if (licByKey) {
    if (new Date(licByKey.expires_at) < new Date()) {
      res.status(400).json({ error: `كود الترخيص منتهي الصلاحية بتاريخ (${licByKey.expires_at}). يرجى التواصل مع إدارة النظام للتجديد.` });
      return;
    }
    const devCount = (db.prepare("SELECT COUNT(*) as c FROM license_devices WHERE license_id=? AND (status IS NULL OR status='authorized' OR status='active')").get(licByKey.id) as any)?.c || 0;
    const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(licByKey.id, currentDev) as any;
    
    if (!existing && devCount >= (licByKey.devices_limit || 1)) {
      res.status(400).json({ error: `تم استنفاد الحد الأقصى للأجهزة المرخصة لهذا الكود (${devCount}/${licByKey.devices_limit}). يرجى ترقية عدد الأجهزة مع المطور.` });
      return;
    }

    if (existing) {
      db.prepare("UPDATE license_devices SET status='authorized', last_active=datetime('now', 'localtime') WHERE id=?").run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, 'تفعيل مباشر بكود الترخيص', 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(licByKey.id, currentDev, device_name || `جهاز مفعل (${os.hostname()})`);
    }

    res.json({
      success: true,
      message: "ألف مبروك تم ترخيص وتفعيل النظام بنجاح! 🎉✅ قم بتسجيل الدخول للنظام باسم المستخدم: admin وكلمة السر: admin123",
      deviceId: currentDev,
      clientName: licByKey.client_name,
      expiresAt: licByKey.expires_at,
      devicesLimit: licByKey.devices_limit,
      credentials: {
        username: "admin",
        password: "admin123"
      }
    });
    return;
  }

  // 3. Tertiary Strategy: Cryptographic HMAC signature fallback (for legacy codes)
  const exp = expires_at || "2027-12-31";
  const ver = target_version || CURRENT_SYSTEM_VERSION;
  
  const limitsToTest = [1, 2, 3, 5, 10, 20, 50, 100, 999];
  let verified = false;
  let matchedLimit = 1;

  for (const lim of limitsToTest) {
    if (verifyActivationCode(rawCode, currentDev, exp, ver, lim) ||
        verifyActivationCode(rawCode, currentDev, exp, "*", lim) ||
        verifyActivationCode(rawCode, currentDev, "2027-12-31", CURRENT_SYSTEM_VERSION, lim) ||
        verifyActivationCode(rawCode, "*", exp, ver, lim)) {
      verified = true;
      matchedLimit = lim;
      break;
    }
  }

  if (verified) {
    let lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get() as any;
    if (!lic) {
      const r = db.prepare(`
        INSERT INTO licenses (license_key, client_name, devices_limit, expires_at, active, status, target_version, license_type)
        VALUES (?, ?, ?, ?, 1, 'active', ?, 'desktop')
      `).run(rawCode, client_name || "عميل مرخص", matchedLimit, exp, ver);
      lic = db.prepare("SELECT * FROM licenses WHERE id=?").get(r.lastInsertRowid);
    } else {
      db.prepare("UPDATE licenses SET expires_at=?, target_version=?, active=1, status='active', devices_limit=? WHERE id=?").run(exp, ver, matchedLimit, lic.id);
    }

    // Register device
    const existing = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDev) as any;
    if (existing) {
      db.prepare("UPDATE license_devices SET status='authorized', authorized_by='كود تفعيل رقمي مشفر', last_active=datetime('now', 'localtime') WHERE id=?").run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active, registered_at)
        VALUES (?, ?, ?, 'كود تفعيل رقمي مشفر', 'authorized', datetime('now', 'localtime'), datetime('now', 'localtime'))
      `).run(lic.id, currentDev, device_name || `جهاز مفعل (${os.hostname()})`);
    }

    res.json({
      success: true,
      message: "ألف مبروك تم ترخيص وتفعيل النظام بنجاح! 🎉✅ قم بتسجيل الدخول للنظام باسم المستخدم: admin وكلمة السر: admin123",
      deviceId: currentDev,
      clientName: client_name || lic.client_name,
      expiresAt: exp,
      devicesLimit: matchedLimit,
      credentials: {
        username: "admin",
        password: "admin123"
      }
    });
    return;
  }

  res.status(400).json({
    error: "كود الترخيص المدخل غير مطابق لبصمة هذا الجهاز أو منتهي الصلاحية. يرجى مراجعة إدارة النظام للحصول على كود ترخيص معتمد."
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
