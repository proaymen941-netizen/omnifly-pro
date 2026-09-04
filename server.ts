import express from "express";
import path from "node:path";
import fs from "node:fs";
import app from "./artifacts/api-server/src/app";

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
      configFile: path.resolve(process.cwd(), "artifacts/pos-system/vite.config.ts"),
    });
    app.use(vite.middlewares);
  } else {
    const candidates = [
      path.resolve(process.cwd(), "dist/public"),
      path.resolve(process.cwd(), "artifacts/pos-system/dist/public"),
      path.resolve(__dirname, "dist/public"),
      path.resolve(__dirname, "artifacts/pos-system/dist/public"),
    ];
    const distPath = candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) || candidates[0];

    process.env.FRONTEND_DIST = distPath;
    app.use(express.static(distPath));
    app.use("/assets", express.static(path.resolve(process.cwd(), "public/assets")));
    app.use("/assets", express.static(path.resolve(process.cwd(), "artifacts/pos-system/public/assets")));
    app.use(express.static(path.resolve(process.cwd(), "public")));
    app.use(express.static(path.resolve(process.cwd(), "artifacts/pos-system/public")));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        res.sendStatus(404);
        return;
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      const actualPort = typeof server.address() === 'object' && server.address() !== null 
        ? (server.address() as any).port 
        : PORT;
      console.log(`🚀 OmniFly Pro Server running on http://0.0.0.0:${actualPort}`);
      resolve({ server, port: actualPort });
    });

    server.on('error', (err: any) => {
      console.error(`Failed to start server on port ${PORT}:`, err);
      reject(err);
    });
  });
}

export { startServer, app };
export default app;

// Only auto-start if this file is run directly
import { fileURLToPath } from "node:url";
let isMain = false;
try {
  if (process.argv[1] && typeof __filename !== 'undefined' && process.argv[1] === __filename) {
    isMain = true;
  } else if (process.argv[1] && import.meta.url) {
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      isMain = true;
    }
  }
} catch (e) {}

if (isMain) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

