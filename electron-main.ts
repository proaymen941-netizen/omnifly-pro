import { app as electronApp, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import expressApp from "./artifacts/api-server/src/app";

// Handle print-silent IPC invocation
ipcMain.handle("print-silent", async (event, printerName: string) => {
  const webContents = event.sender;
  return new Promise((resolve) => {
    webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: printerName ? printerName.trim() : "",
      },
      (success, failureReason) => {
        if (!success) {
          console.error("Silent printing failed in main process:", failureReason);
        }
        resolve({ success, failureReason });
      }
    );
  });
});

// In production, set the environment variables before initializing the database
const userDataPath = electronApp.getPath("userData");
const dbPath = path.join(userDataPath, "pos.db");
process.env.DB_PATH = dbPath;

// Set FRONTEND_DIST to the path where Vite builds the frontend
const isDev = process.env.NODE_ENV === "development";
const frontendDistPath = isDev
  ? path.resolve(process.cwd(), "artifacts/pos-system/dist/public")
  : path.join(electronApp.getAppPath(), "artifacts/pos-system/dist/public");

process.env.FRONTEND_DIST = frontendDistPath;

let mainWindow: BrowserWindow | null = null;
let server: any = null;

function startServer(port: number) {
  return new Promise<void>((resolve, reject) => {
    server = expressApp.listen(port, "127.0.0.1", () => {
      console.log(`Server started internally on port ${port}`);
      resolve();
    });
    server.on("error", (err: any) => {
      reject(err);
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "OmniFly Pro — نظام إدارة الطيران والسياحة والمؤسسات المتكامل",
    autoHideMenuBar: true, // Hide menu bar for a clean desktop feel
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const appUrl = "http://127.0.0.1:4050/login";

  mainWindow.webContents.on("did-fail-load", () => {
    console.warn("Page load failed, retrying in 1s...");
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(appUrl);
      }
    }, 1000);
  });

  mainWindow.loadURL(appUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

electronApp.whenReady().then(async () => {
  const port = 4050;
  
  try {
    await startServer(port);
  } catch (err) {
    console.error("Failed to start server:", err);
  }

  createWindow();

  electronApp.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

electronApp.on("window-all-closed", () => {
  if (server) {
    server.close();
  }
  electronApp.quit();
});
