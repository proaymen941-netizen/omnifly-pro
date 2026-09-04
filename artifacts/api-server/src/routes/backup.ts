import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import multer from "multer";
import { getAuthUser } from "./auth";
import { db } from "../lib/sqlite";

const router = Router();
const upload = multer({ dest: os.tmpdir() });

let customBackupDir = path.join(os.homedir(), "OmniSystem_Backups");
let autoBackupEnabled = true;
let autoBackupIntervalMinutes = 30;
let maxRetainedBackups = 50;
let lastAutoBackupTime: Date | null = null;
let autoBackupTimer: NodeJS.Timeout | null = null;

function getBackupDir(): string {
  if (!fs.existsSync(customBackupDir)) {
    try {
      fs.mkdirSync(customBackupDir, { recursive: true });
    } catch (e) {
      console.error("Failed to create custom backup dir, falling back to default:", e);
      customBackupDir = path.join(os.homedir(), "OmniSystem_Backups");
      fs.mkdirSync(customBackupDir, { recursive: true });
    }
  }
  return customBackupDir;
}

getBackupDir();

function requireDeveloper(req: any, res: any) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول أولاً" });
    return false;
  }
  const role = user.role;
  const username = user.username;
  if (role === "admin" || role === "manager" || role === "developer" || username === "admin" || username === "developer" || role === "مدير") {
    return true;
  }
  res.status(403).json({ error: "غير مصرح. هذه الصلاحية مقتصرة على مدراء النظام والمطورين." });
  return false;
}

export function performBackup(reason: string = "manual"): { success: boolean; path: string; name: string; size: number } {
  const dir = getBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const prefix = reason === "auto" ? "pos_auto_backup" : "pos_instant_backup";
  const backupFileName = `${prefix}_${timestamp}.db`;
  const backupFilePath = path.join(dir, backupFileName);

  const dbPath = path.resolve(process.cwd(), "artifacts/api-server/data/pos.db");
  const fallbackDbPath = path.resolve(process.cwd(), "data/pos.db");
  const actualDbPath = fs.existsSync(dbPath) ? dbPath : fallbackDbPath;

  if (!fs.existsSync(actualDbPath)) {
    throw new Error(`قاعدة البيانات غير موجودة في المسار: ${actualDbPath}`);
  }

  // Force checkpoint if WAL is used to sync data to disk
  try {
    db.pragma("wal_checkpoint(PASSIVE)");
  } catch (e) {
    // Ignore if not supported or busy
  }

  fs.copyFileSync(actualDbPath, backupFilePath);

  // Also copy WAL and SHM if they exist to ensure consistency
  if (fs.existsSync(actualDbPath + "-wal")) {
    try { fs.copyFileSync(actualDbPath + "-wal", backupFilePath + "-wal"); } catch (e) {}
  }
  if (fs.existsSync(actualDbPath + "-shm")) {
    try { fs.copyFileSync(actualDbPath + "-shm", backupFilePath + "-shm"); } catch (e) {}
  }

  // Prune older backups if exceeding max limit
  try {
    const allBackups = fs.readdirSync(dir)
      .filter(f => f.endsWith(".db"))
      .map(f => ({ name: f, fullPath: path.join(dir, f), time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (allBackups.length > maxRetainedBackups) {
      const toDelete = allBackups.slice(maxRetainedBackups);
      for (const item of toDelete) {
        try { fs.unlinkSync(item.fullPath); } catch (e) {}
        try { if (fs.existsSync(item.fullPath + "-wal")) fs.unlinkSync(item.fullPath + "-wal"); } catch (e) {}
        try { if (fs.existsSync(item.fullPath + "-shm")) fs.unlinkSync(item.fullPath + "-shm"); } catch (e) {}
      }
    }
  } catch (e) {
    console.error("Error during backup rotation:", e);
  }

  lastAutoBackupTime = new Date();
  const stat = fs.statSync(backupFilePath);
  return { success: true, path: backupFilePath, name: backupFileName, size: stat.size };
}

function startAutoBackupEngine() {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }

  if (!autoBackupEnabled) return;

  const intervalMs = Math.max(1, autoBackupIntervalMinutes) * 60 * 1000;
  autoBackupTimer = setInterval(() => {
    try {
      console.log(`[Auto-Backup] Running scheduled background backup (Interval: ${autoBackupIntervalMinutes}m)...`);
      const res = performBackup("auto");
      console.log(`[Auto-Backup] Saved snapshot successfully: ${res.name}`);
    } catch (err) {
      console.error("[Auto-Backup] Failed to take scheduled backup:", err);
    }
  }, intervalMs);

  // Take an initial backup shortly after server boots if no backup exists yet
  setTimeout(() => {
    try {
      const dir = getBackupDir();
      const files = fs.readdirSync(dir).filter(f => f.endsWith(".db"));
      if (files.length === 0) {
        performBackup("auto");
      }
    } catch (e) {}
  }, 10000);
}

startAutoBackupEngine();

// 1. Create a manual / instant backup now
router.post("/system/backup", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const result = performBackup("manual");
    res.json({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية اللحظية وحفظها بأمان على الجهاز بنجاح",
      path: result.path,
      name: result.name,
      size: result.size
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Download a specific backup or latest database backup directly
router.get("/system/backup/download/:filename?", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const dir = getBackupDir();
    let targetFile = "";
    
    if (req.params.filename && req.params.filename !== "latest") {
      const safeName = path.basename(req.params.filename);
      targetFile = path.join(dir, safeName);
    } else {
      // Create a fresh instant snapshot and download it
      const snap = performBackup("instant_download");
      targetFile = snap.path;
    }

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: "ملف النسخة الاحتياطية غير موجود" });
    }

    res.download(targetFile, path.basename(targetFile));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Delete a backup file
router.delete("/system/backup/:filename", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const dir = getBackupDir();
    const safeName = path.basename(req.params.filename);
    const targetFile = path.join(dir, safeName);

    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      if (fs.existsSync(targetFile + "-wal")) {
        try { fs.unlinkSync(targetFile + "-wal"); } catch (e) {}
      }
      if (fs.existsSync(targetFile + "-shm")) {
        try { fs.unlinkSync(targetFile + "-shm"); } catch (e) {}
      }
      res.json({ success: true, message: "تم حذف النسخة الاحتياطية بنجاح" });
    } else {
      res.status(404).json({ error: "الملف غير موجود" });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Get backup engine settings & status
router.get("/system/backup/settings", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    res.json({
      autoBackupEnabled,
      autoBackupIntervalMinutes,
      maxRetainedBackups,
      backupDir: getBackupDir(),
      lastAutoBackupTime: lastAutoBackupTime ? lastAutoBackupTime.toISOString() : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Update backup engine settings
router.post("/system/backup/settings", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const { enabled, intervalMinutes, maxBackups, customPath } = req.body;
    if (enabled !== undefined) autoBackupEnabled = Boolean(enabled);
    if (intervalMinutes && Number(intervalMinutes) >= 1) autoBackupIntervalMinutes = Number(intervalMinutes);
    if (maxBackups && Number(maxBackups) >= 5) maxRetainedBackups = Number(maxBackups);
    if (customPath && typeof customPath === "string" && customPath.trim()) {
      customBackupDir = customPath.trim();
      getBackupDir();
    }

    startAutoBackupEngine();

    res.json({
      success: true,
      message: "تم تحديث إعدادات محرك النسخ الاحتياطي التلقائي بنجاح",
      settings: {
        autoBackupEnabled,
        autoBackupIntervalMinutes,
        maxRetainedBackups,
        backupDir: getBackupDir(),
        lastAutoBackupTime: lastAutoBackupTime ? lastAutoBackupTime.toISOString() : null,
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 6. List backups
router.get(["/system/backups", "/system/backup/list"], (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const dir = getBackupDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith(".db"))
      .map(f => {
        const stats = fs.statSync(path.join(dir, f));
        return { 
          name: f, 
          path: path.join(dir, f), 
          size: stats.size, 
          createdAt: stats.mtime,
          isAuto: f.includes("auto")
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(files);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Restore uploaded backup
router.post("/system/restore", upload.single("dbFile"), (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم رفع ملف قاعدة البيانات" });
    }

    const dbPath = path.resolve(process.cwd(), "artifacts/api-server/data/pos.db");
    const fallbackDbPath = path.resolve(process.cwd(), "data/pos.db");
    const actualDbPath = fs.existsSync(dbPath) ? dbPath : fallbackDbPath;

    // 1. Close database to unlock file on the system (critical for Windows/Linux)
    try {
      db.close();
      console.log("Database connection closed for restore.");
    } catch (err) {
      console.error("Error closing database:", err);
    }

    // 2. Clear WAL/SHM so SQLite doesn't overwrite from logs on boot
    if (fs.existsSync(actualDbPath + "-wal")) {
      try { fs.unlinkSync(actualDbPath + "-wal"); } catch (e) {}
    }
    if (fs.existsSync(actualDbPath + "-shm")) {
      try { fs.unlinkSync(actualDbPath + "-shm"); } catch (e) {}
    }

    // 3. Force remove old DB file to prevent write-busy locks
    try {
      if (fs.existsSync(actualDbPath)) {
        fs.unlinkSync(actualDbPath);
      }
    } catch (e) {
      console.warn("Could not delete old DB file directly, overwriting...", e);
    }

    // 4. Write new DB file
    fs.copyFileSync(req.file.path, actualDbPath);
    
    // Delete temporary upload file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({ success: true, message: "تمت استعادة النسخة الاحتياطية بنجاح. سيتم إعادة تشغيل الخادم والبرنامج الآن لتطبيق البيانات المستعادة." });
    
    // Force restart the server after 1.5 seconds so the client receives the response
    setTimeout(() => {
      process.exit(0);
    }, 1500);

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Restore local backup (direct from server-side folder)
router.post("/system/restore-local", (req, res) => {
  if (!requireDeveloper(req, res)) return;
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "اسم ملف النسخة الاحتياطية مطلوب" });
    }

    const dir = getBackupDir();
    const safeFilename = path.basename(filename);
    const sourceFilePath = path.join(dir, safeFilename);

    if (!fs.existsSync(sourceFilePath)) {
      return res.status(404).json({ error: "ملف النسخة الاحتياطية غير موجود على الجهاز" });
    }

    const dbPath = path.resolve(process.cwd(), "artifacts/api-server/data/pos.db");
    const fallbackDbPath = path.resolve(process.cwd(), "data/pos.db");
    const actualDbPath = fs.existsSync(dbPath) ? dbPath : fallbackDbPath;

    // 1. Close database to unlock file on the system
    try {
      db.close();
      console.log("Database connection closed for local restore.");
    } catch (err) {
      console.error("Error closing database:", err);
    }

    // 2. Clear WAL/SHM
    if (fs.existsSync(actualDbPath + "-wal")) {
      try { fs.unlinkSync(actualDbPath + "-wal"); } catch (e) {}
    }
    if (fs.existsSync(actualDbPath + "-shm")) {
      try { fs.unlinkSync(actualDbPath + "-shm"); } catch (e) {}
    }

    // 3. Force remove old DB file
    try {
      if (fs.existsSync(actualDbPath)) {
        fs.unlinkSync(actualDbPath);
      }
    } catch (e) {
      console.warn("Could not delete old DB file directly, overwriting...", e);
    }

    // 4. Copy the selected local backup file
    fs.copyFileSync(sourceFilePath, actualDbPath);

    res.json({ success: true, message: "تمت استعادة النسخة الاحتياطية بنجاح. سيتم إعادة تشغيل الخادم والبرنامج الآن لتطبيق البيانات المستعادة." });

    setTimeout(() => {
      process.exit(0);
    }, 1500);

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
