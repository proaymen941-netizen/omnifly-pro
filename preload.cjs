// artifacts/pos-system/src/main/preload.js
var { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron
});
