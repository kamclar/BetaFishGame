const { app, BrowserWindow, Menu, ipcMain, screen } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = Math.min(1240, Math.max(960, Math.floor(workArea.width * 0.9)));
  const windowHeight = Math.min(840, Math.max(680, Math.floor(workArea.height * 0.88)));
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 820,
    minHeight: 600,
    center: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: false,
    title: "Beta Fish Game",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const query = process.argv.includes("--debug-time") ? { debugTime: "1" } : undefined;
  mainWindow.loadFile(path.join(__dirname, "..", "prototype", "index.html"), { query });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window:toggle-always-on-top", () => {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop(), "floating");
});

ipcMain.on("window:close", () => {
  mainWindow?.close();
});

ipcMain.on("window:move", (event, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});
