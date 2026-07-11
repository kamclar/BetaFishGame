const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopWindow", {
  minimize: () => ipcRenderer.send("window:minimize"),
  toggleAlwaysOnTop: () => ipcRenderer.send("window:toggle-always-on-top"),
  close: () => ipcRenderer.send("window:close"),
  move: (dx, dy) => ipcRenderer.send("window:move", { dx, dy }),
});
