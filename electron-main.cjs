// artifacts/pos-system/src/main/main.js
var { app, BrowserWindow, screen, session } = require("electron");
var path = require("path");
var fs = require("fs");
var userDataPath = app.getPath("userData");
var dbDir = path.join(userDataPath, "data");
var dbPath = path.join(dbDir, "pos.db");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  const seedCandidates = [
    path.join(__dirname, "artifacts", "api-server", "data", "pos.db"),
    path.join(process.cwd(), "artifacts", "api-server", "data", "pos.db"),
    path.join(__dirname, "..", "..", "..", "artifacts", "api-server", "data", "pos.db"),
    path.join(__dirname, "data", "pos.db"),
    path.join(process.cwd(), "data", "pos.db")
  ];
  const seedDbPath = seedCandidates.find((p) => fs.existsSync(p));
  if (seedDbPath) {
    try {
      fs.copyFileSync(seedDbPath, dbPath);
      console.log("Database successfully seeded on first launch from:", seedDbPath);
      const seedWal = seedDbPath + "-wal";
      const destWal = dbPath + "-wal";
      if (fs.existsSync(seedWal)) {
        fs.copyFileSync(seedWal, destWal);
      }
      const seedShm = seedDbPath + "-shm";
      const destShm = dbPath + "-shm";
      if (fs.existsSync(seedShm)) {
        fs.copyFileSync(seedShm, destShm);
      }
    } catch (err) {
      console.error("Error seeding database:", err);
    }
  }
}
process.env.DB_PATH = dbPath;
process.env.OMNISYSTEM_DB_PATH = dbPath;
process.env.NODE_ENV = "production";
process.env.PORT = "4050";
var possibleDistPaths = [
  path.join(__dirname, "dist", "public"),
  path.join(process.cwd(), "dist", "public"),
  path.join(__dirname, "artifacts", "pos-system", "dist", "public"),
  path.join(process.cwd(), "artifacts", "pos-system", "dist", "public"),
  path.join(__dirname, "dist"),
  path.join(process.cwd(), "dist")
];
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, "index.html"))) {
    process.env.FRONTEND_DIST = p;
    console.log("Detected frontend static dist path:", p);
    break;
  }
}
var startServer;
try {
  const serverCandidates = [
    path.join(__dirname, "dist", "server.cjs"),
    path.join(process.cwd(), "dist", "server.cjs"),
    path.join(__dirname, "server.cjs")
  ];
  const foundServerPath = serverCandidates.find((p) => fs.existsSync(p));
  if (foundServerPath) {
    const srv = require(foundServerPath);
    startServer = srv.startServer || srv.default || srv;
  }
} catch (err) {
  console.warn("Note on server module loading:", err);
}
var mainWindow;
function setupDownloadHandler() {
  if (!session || !session.defaultSession) return;
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") {
      callback(true);
    } else {
      callback(true);
    }
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === "media") return true;
    return true;
  });
  session.defaultSession.on("will-download", (event, item, webContents) => {
    try {
      const downloadsPath = app.getPath("downloads");
      const fileName = item.getFilename() || `download_${Date.now()}`;
      const savePath = path.join(downloadsPath, fileName);
      if (!item.getSavePath()) {
        item.setSavePath(savePath);
      }
      item.on("updated", (evt, state) => {
        if (state === "interrupted") {
          console.log("Download was interrupted");
        }
      });
      item.once("done", (evt, state) => {
        if (state === "completed") {
          console.log("Download completed successfully:", item.getSavePath());
        } else {
          console.error(`Download failed state: ${state}`);
        }
      });
    } catch (err) {
      console.error("Error handling download item:", err);
    }
  });
}
async function createWindow() {
  let serverPort = 4050;
  try {
    if (typeof startServer === "function") {
      const result = await startServer(4050);
      if (result && result.port) {
        serverPort = result.port;
      }
    }
  } catch (error) {
    console.error("Failed to start local Express server:", error);
  }
  setupDownloadHandler();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1366, width),
    height: Math.min(850, height),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    },
    title: "OmniFly Pro \u2014 \u0646\u0638\u0627\u0645 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0637\u064A\u0631\u0627\u0646 \u0648\u0627\u0644\u0633\u064A\u0627\u062D\u0629 \u0648\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062A \u0627\u0644\u0645\u062A\u0643\u0627\u0645\u0644",
    autoHideMenuBar: true
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return { action: "allow" };
  });
  const appUrl = `http://127.0.0.1:${serverPort}/login`;
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.warn(`Page load failed (${errorCode}: ${errorDescription}), retrying in 1s...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(appUrl);
      }
    }, 1e3);
  });
  mainWindow.loadURL(appUrl);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
var isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.on("ready", () => {
    createWindow();
  });
}
app.on("window-all-closed", () => {
  app.quit();
  try {
    process.exit(0);
  } catch (e) {
  }
});
app.on("will-quit", () => {
  console.log("Desktop application exiting: terminating all background tasks.");
  try {
    process.exit(0);
  } catch (e) {
  }
});
