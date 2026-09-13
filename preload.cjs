// artifacts/pos-system/src/main/preload.js
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
  openWhatsAppDesktop: (payload) => ipcRenderer.invoke("open-whatsapp-desktop", payload)
});
