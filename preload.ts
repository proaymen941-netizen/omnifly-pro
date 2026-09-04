import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printSilent: (printerName: string) => ipcRenderer.invoke("print-silent", printerName),
});
