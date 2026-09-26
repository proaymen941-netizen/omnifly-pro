import { Router } from "express";
import { db, verifyPassword, hashPassword, createSession, getSessionUser, deleteSession } from "../lib/sqlite";
import { logger } from "../lib/logger";
import os from "node:os";
import crypto from "node:crypto";

const router = Router();

export function getSystemDeviceId(): string {
  try {
    const interfaces = os.networkInterfaces();
    const macList: string[] = [];
    for (const name of Object.keys(interfaces).sort()) {
      const iface = interfaces[name];
      if (iface) {
        for (const ip of iface) {
          if (!ip.internal && ip.mac && ip.mac !== "00:00:00:00:00:00" && ip.mac !== "ff:ff:ff:ff:ff:ff") {
            macList.push(ip.mac.toUpperCase());
          }
        }
      }
    }
    const cpus = os.cpus() || [];
    const cpuModel = cpus[0]?.model || "GENERIC-CPU";
    const cpuCount = cpus.length;
    const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();

    const rawId = `HWID|${platform}|${arch}|${hostname}|${cpuModel}|${cpuCount}|${totalMem}GB|${macList.sort().join(",")}`;
    const hash = crypto.createHash("sha256").update(rawId).digest("hex").toUpperCase();
    return `HW-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
  } catch (e) {
    return "HW-OMNI-DEV-0001";
  }
}

export const CURRENT_SYSTEM_VERSION = "1.1.0";

export interface LicenseStatusResult {
  blocked: boolean;
  code?: "license_required" | "license_expired" | "license_suspended" | "version_upgrade_required" | "device_unauthorized" | "device_blocked";
  deviceId: string;
  licenseType?: "cloud" | "desktop";
  reason?: string;
  clientName?: string;
  expiresAt?: string;
  remainingDays?: number;
  isWarning?: boolean;
  warningMessage?: string;
  targetVersion?: string;
  currentVersion?: string;
  devicesLimit?: number;
  activeDevicesCount?: number;
}

export function checkLicenseStatus(deviceId?: string): LicenseStatusResult {
  try {
    const currentDevice = deviceId || getSystemDeviceId();
    const totalLicensesCount = (db.prepare("SELECT COUNT(*) as c FROM licenses").get() as { c: number })?.c || 0;
    if (totalLicensesCount === 0) {
      return {
        blocked: true,
        code: "license_required",
        deviceId: currentDevice,
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: "النظام غير مرخص. يرجى قيام مطور النظام بتسجيل الدخول وإصدار ترخيص السحابة أو ترخيص الجهاز."
      };
    }

    const lic = db.prepare("SELECT * FROM licenses WHERE active=1 AND (status IS NULL OR status='active') ORDER BY id DESC LIMIT 1").get() as any;
    if (!lic) {
      return {
        blocked: true,
        code: "license_suspended",
        deviceId: currentDevice,
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: "تم إيقاف أو تعليق ترخيص النظام من قبل المطور. يرجى التواصل مع مطور النظام لتفعيل الترخيص."
      };
    }

    const expireDate = new Date(lic.expires_at);
    const currentDate = new Date();
    
    // Set both to midnight to count full days
    expireDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const diffTime = expireDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        blocked: true, 
        code: "license_expired",
        deviceId: currentDevice,
        clientName: lic.client_name,
        expiresAt: lic.expires_at,
        licenseType: lic.license_type || "cloud",
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: `انتهت فترة صلاحية ترخيص النظام الممنوحة لهذا العميل (${lic.expires_at}). يرجى التواصل مع المطور لتجديد وتمديد الترخيص السحابي.`
      };
    }

    // Version validation check:
    // If license is bound to a specific version and not '*' (all versions), block login and require developer upgrade
    if (lic.target_version && lic.target_version !== "*" && lic.target_version !== CURRENT_SYSTEM_VERSION) {
      return {
        blocked: true,
        code: "version_upgrade_required",
        deviceId: currentDevice,
        clientName: lic.client_name,
        expiresAt: lic.expires_at,
        licenseType: lic.license_type || "cloud",
        targetVersion: lic.target_version,
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: `تم تثبيت وتحديث إصدار جديد من النظام (v${CURRENT_SYSTEM_VERSION}) بينما الترخيص السابق مخصص للنسخة (v${lic.target_version}). لا يُسمح بتشغيل النظام بعد التحديث إلا بعد اعتماد وترخيص الإصدار الجديد من قِبل المطور.`
      };
    }

    const activeDevicesCount = (db.prepare("SELECT COUNT(*) as c FROM license_devices WHERE license_id=? AND (status IS NULL OR status='authorized' OR status='active')").get(lic.id) as { c: number })?.c || 1;

    const isWarning = diffDays <= 15 && diffDays > 0;
    const warningMessage = isWarning
      ? `تنبيه: متبقي ${diffDays} يوم فقط على انتهاء ترخيص هذا الجهاز (${lic.expires_at}). يرجى سرعة التواصل مع إدارة ومطور النظام لتجديد الترخيص قبل موعد التوقف.`
      : undefined;

    // CLOUD LICENSE SUPPORT:
    // If license is a Cloud License (or by default in web deployments), all users accessing this cloud instance are authorized under the cloud master license
    const isCloudLicense = !lic.license_type || lic.license_type === "cloud" || lic.license_type === "سحابي";
    if (isCloudLicense) {
      return {
        blocked: false,
        deviceId: currentDevice,
        licenseType: "cloud",
        clientName: lic.client_name,
        expiresAt: lic.expires_at,
        remainingDays: diffDays,
        isWarning,
        warningMessage,
        targetVersion: lic.target_version || CURRENT_SYSTEM_VERSION,
        currentVersion: CURRENT_SYSTEM_VERSION,
        devicesLimit: lic.devices_limit || 999,
        activeDevicesCount
      };
    }

    // STRICT Physical Device Authorization Check for Desktop / Offline mode:
    const deviceCheck = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDevice) as any;
    
    if (!deviceCheck) {
      return { 
        blocked: true, 
        code: "device_unauthorized",
        deviceId: currentDevice,
        licenseType: "desktop",
        clientName: lic.client_name,
        expiresAt: lic.expires_at,
        remainingDays: diffDays,
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: `هذا الجهاز (بصمة الجهاز: ${currentDevice}) غير مرخص له بتشغيل النظام. يُمنع منعاً باتاً تشغيل النظام عند نسخ ملفاته إلى جهاز آخر بدون ترخيص معتمد من المطور.`
      };
    }

    if (deviceCheck.status === 'blocked' || deviceCheck.status === 'disabled') {
      return {
        blocked: true,
        code: "device_blocked",
        deviceId: currentDevice,
        licenseType: "desktop",
        clientName: lic.client_name,
        expiresAt: lic.expires_at,
        remainingDays: diffDays,
        currentVersion: CURRENT_SYSTEM_VERSION,
        reason: `تم حظر هذا الجهاز (${currentDevice}) من قِبل المطور. يرجى التواصل مع المطور لفك الحظر.`
      };
    }

    // Update last active
    try {
      db.prepare("UPDATE license_devices SET last_active = datetime('now', 'localtime') WHERE id = ?").run(deviceCheck.id);
    } catch (e) {}

    return { 
      blocked: false,
      deviceId: currentDevice,
      licenseType: "desktop",
      clientName: lic.client_name,
      expiresAt: lic.expires_at,
      remainingDays: diffDays,
      isWarning,
      warningMessage,
      targetVersion: lic.target_version || CURRENT_SYSTEM_VERSION,
      currentVersion: CURRENT_SYSTEM_VERSION,
      devicesLimit: lic.devices_limit,
      activeDevicesCount
    };
  } catch (e) {
    return {
      blocked: true,
      code: "license_required",
      deviceId: getSystemDeviceId(),
      currentVersion: CURRENT_SYSTEM_VERSION,
      reason: "خطأ في فحص ترخيص النظام. يرجى التواصل مع مطور النظام."
    };
  }
}

export function getAuthUser(req: any) {
  try {
    const auth = req.headers?.authorization;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token) {
        const userId = getSessionUser(token);
        if (userId) {
          const user = db.prepare("SELECT id, username, name, role, active, can_discount FROM users WHERE id=?").get(userId) as any;
          if (user && user.active) return user;
        }
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
    return;
  }

  const cleanUsername = String(username).trim();
  const isDeveloperUser = cleanUsername.toLowerCase() === "developer";

  // License status check: Only developer account can bypass and login when unlicensed/expired
  if (!isDeveloperUser) {
    const licenseStatus = checkLicenseStatus();
    if (licenseStatus.blocked) {
      res.status(403).json({
        error: licenseStatus.code || "license_blocked",
        code: licenseStatus.code || "license_blocked",
        deviceId: licenseStatus.deviceId,
        message: licenseStatus.reason || "تم إيقاف أو انتهاء ترخيص النظام أو أن هذا الجهاز غير مرخص. يرجى التواصل مع المطور."
      });
      return;
    }
  }

  const user = db.prepare("SELECT * FROM users WHERE LOWER(username)=LOWER(?)").get(cleanUsername) as any;
  if (!user || !user.active) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة أو الحساب معطل" });
    return;
  }
  const ok = verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    return;
  }

  // If developer logs in, ensure this current device is authorized in the active license
  if (user.role === "developer" || user.username?.toLowerCase() === "developer") {
    try {
      let lic = db.prepare("SELECT * FROM licenses WHERE active=1 ORDER BY id DESC LIMIT 1").get() as any;
      if (lic) {
        const currentDevice = getSystemDeviceId();
        const deviceCheck = db.prepare("SELECT * FROM license_devices WHERE license_id=? AND device_id=?").get(lic.id, currentDevice);
        if (!deviceCheck) {
          db.prepare(`
            INSERT INTO license_devices (license_id, device_id, device_name, authorized_by, status, last_active)
            VALUES (?, ?, ?, 'مطور النظام (تسجيل مباشر)', 'authorized', datetime('now', 'localtime'))
          `).run(lic.id, currentDevice, `جهاز المطور الرئيسي (${os.hostname()})`);
        } else {
          db.prepare("UPDATE license_devices SET status='authorized', last_active=datetime('now', 'localtime') WHERE id=?").run(deviceCheck.id);
        }
      }
    } catch (e) {
      console.error("Developer device auto-auth error:", e);
    }
  }

  const token = createSession(user.id);

  // Log active session in erp_sessions
  const deviceName = req.body.device_name || (req.headers["user-agent"] ? req.headers["user-agent"].split(" ")[0] : "متصفح الويب");
  try {
    db.prepare(`
      INSERT INTO erp_sessions (username, device_name, login_time, status, branch_id, language)
      VALUES (?, ?, datetime('now', 'localtime'), 'نشط', 1, 'عربي')
    `).run(user.name, deviceName);
  } catch (err) {
    console.error("Failed to log erp session:", err);
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      active: Boolean(user.active),
      can_discount: Boolean(user.can_discount !== undefined && user.can_discount !== null ? user.can_discount : (user.role === "admin" || user.role === "developer" || user.role === "accountant"))
    },
  });
});

router.get("/auth/me", (req, res) => {
  const user = getAuthUser(req);
  if (!user) { res.status(401).json({ error: "غير مصرح" }); return; }

  const isDev = user.username?.toLowerCase() === "developer" || user.role === "developer";
  if (!isDev) {
    const licenseStatus = checkLicenseStatus();
    if (licenseStatus.blocked) {
      res.status(403).json({
        error: licenseStatus.code || "license_blocked",
        code: licenseStatus.code || "license_blocked",
        message: licenseStatus.reason || "تم انتهاء فترة ترخيص استخدام النظام أو الجهاز غير مرخص. يرجى التواصل مع المطور لتمديد الترخيص."
      });
      return;
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: Boolean(user.active),
    can_discount: Boolean(user.can_discount !== undefined && user.can_discount !== null ? user.can_discount : (user.role === "admin" || user.role === "developer" || user.role === "accountant"))
  });
});

router.post("/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const userId = getSessionUser(token);
    if (userId) {
      const user = db.prepare("SELECT name FROM users WHERE id=?").get(userId) as any;
      if (user) {
        try {
          db.prepare(`
            UPDATE erp_sessions 
            SET status = 'خروج', logout_time = datetime('now', 'localtime') 
            WHERE username = ? AND status = 'نشط'
          `).run(user.name);
        } catch (err) {
          console.error("Failed to log erp session logout:", err);
        }
      }
    }
    deleteSession(token);
  }
  res.json({ ok: true });
});

router.post("/auth/change-password", (req, res) => {
  logger.info({ body: { ...req.body, oldPassword: "***", currentPassword: "***", newPassword: "***" } }, "Password change request received");
  try {
    const { username, oldPassword, currentPassword, newPassword } = req.body;
    const passwordToCheck = currentPassword || oldPassword;
    
    if (!passwordToCheck || !newPassword) {
      return res.status(400).json({ error: "الرجاء إدخال كلمة المرور الحالية وكلمة المرور الجديدة" });
    }

    if (String(newPassword).trim().length < 3) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 3 أحرف على الأقل" });
    }

    let fullUser: any = null;

    // Prioritize username specified in request body (especially from /login interface)
    if (username && String(username).trim().length > 0) {
      const cleanUsername = String(username).trim();
      fullUser = db.prepare("SELECT * FROM users WHERE LOWER(TRIM(username))=LOWER(TRIM(?))").get(cleanUsername) as any;
      if (!fullUser) {
        return res.status(404).json({ error: `اسم المستخدم (${cleanUsername}) غير موجود بالنظام` });
      }
    } else {
      // Fallback to active logged-in session user if username not provided
      const user = getAuthUser(req);
      if (user?.id) {
        fullUser = db.prepare("SELECT * FROM users WHERE id=?").get(user.id) as any;
      }
    }

    if (!fullUser) {
      return res.status(401).json({ error: "يرجى تحديد اسم المستخدم أو تسجيل الدخول أولاً" });
    }

    if (!fullUser.active) {
      return res.status(403).json({ error: "هذا الحساب معطل حالياً. يرجى التواصل مع مسؤول النظام." });
    }

    const ok = verifyPassword(String(passwordToCheck), fullUser.password_hash);
    if (!ok) {
      return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const newHash = hashPassword(String(newPassword).trim());
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(newHash, fullUser.id);

    logger.info({ userId: fullUser.id, username: fullUser.username }, "Password changed successfully");
    res.json({ ok: true, message: "تم تغيير كلمة السر بنجاح. يمكنك الآن تسجيل الدخول بها." });
  } catch (error: any) {
    logger.error({ err: error, stack: error.stack }, "Critical error during password change");
    if (!res.headersSent) {
      res.status(500).json({ error: "حدث خطأ داخلي أثناء تغيير كلمة السر: " + error.message });
    }
  }
});

router.post("/auth/verify-supervisor", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور للمدير / المشرف" });
    }
    const user = db.prepare("SELECT * FROM users WHERE (username=? OR name=?) AND active=1").get(username, username) as any;
    if (!user || (user.role !== "admin" && user.role !== "developer" && user.role !== "accountant")) {
      return res.status(403).json({ error: "المستخدم ليس لديه صلاحية مدير أو مشرف لمنح إذن الخصم" });
    }
    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }
    res.json({ ok: true, name: user.name, role: user.role });
  } catch (error: any) {
    res.status(500).json({ error: "حدث خطأ أثناء التحقق من الصلاحية: " + error.message });
  }
});

export default router;
