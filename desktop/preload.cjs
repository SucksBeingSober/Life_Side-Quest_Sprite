const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petAPI", {
  setIgnore: (ignore) => ipcRenderer.send("pet:ignore", ignore),
  dragStart: () => ipcRenderer.send("pet:drag-start"),
  dragEnd: () => ipcRenderer.invoke("pet:drag-end"),
  menu: () => ipcRenderer.send("pet:menu"),
  open: (action) => ipcRenderer.send("pet:open", action),
  talk: (scene) => ipcRenderer.invoke("pet:talk", { scene }),
  log: (message) => ipcRenderer.send("pet:log", String(message)),
  quit: () => ipcRenderer.send("pet:quit"),
  onState: (callback) => ipcRenderer.on("pet:state", (_event, data) => callback(data)),
  onWalk: (callback) => ipcRenderer.on("pet:walk", (_event, data) => callback(data)),
  onFollow: (callback) => ipcRenderer.on("pet:follow", (_event, data) => callback(data)),
  onIdle: (callback) => ipcRenderer.on("pet:idle", () => callback()),
  onBubble: (callback) => ipcRenderer.on("pet:bubble", (_event, data) => callback(data)),
});
