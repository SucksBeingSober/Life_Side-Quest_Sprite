const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  dialog,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const APP_URL = "http://127.0.0.1:3100";
const PET_W = 240;
const PET_H = 300;
const PET_FILE = path.join(__dirname, "pet.html");
const TRAY_ICON = path.join(__dirname, "tray.png");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const dataDir = path.join(ROOT, ".cache", "pet-userdata");
const crashDir = path.join(ROOT, ".cache", "pet-crashes");
const logFile = path.join(ROOT, "desktop.log");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(crashDir, { recursive: true });

function log(...args) {
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 1_000_000) {
      fs.truncateSync(logFile, 0);
    }
    fs.appendFileSync(
      logFile,
      `[${new Date().toISOString()}] ${args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")}\n`,
    );
  } catch {}
}

process.on("uncaughtException", (error) => log("UNCAUGHT", error?.stack || String(error)));
process.on("unhandledRejection", (error) => log("REJECTION", error?.stack || String(error)));
log("boot", process.versions.electron, process.versions.node, `RUN_AS_NODE=${process.env.ELECTRON_RUN_AS_NODE}`);

app.setPath("userData", dataDir);
app.setPath("crashDumps", crashDir);

let petWin = null;
let panelWin = null;
let tray = null;
let serverChild = null;
let serverPromise = null;
let quitting = false;
let petHidden = false;

let dragging = false;
let dragOffset = { x: 0, y: 0 };
let dragStart = { x: 0, y: 0 };
let dragDistance = 0;
let dragTimer = null;

let following = false;
let followTimer = null;
let walkTimer = null;
let walkAnim = null;
const DEBUG = process.env.PET_DEBUG === "1";

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    resetPetPosition();
  });
}

function send(channel, payload) {
  if (petWin && !petWin.isDestroyed() && petWin.webContents) {
    petWin.webContents.send(channel, payload);
  }
}

function probeServer(timeout = 900) {
  return new Promise((resolve) => {
    const request = http.get(APP_URL, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(timeout, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  if (await probeServer()) return true;
  if (!serverPromise) {
    serverPromise = (async () => {
      const env = {
        ...process.env,
        NODE_ENV: "production",
        PORT: "3100",
        ELECTRON_RUN_AS_NODE: "1",
        NEXT_TELEMETRY_DISABLED: "1",
      };
      serverChild = spawn(process.execPath, [path.join(ROOT, "server.mjs")], {
        cwd: ROOT,
        env,
        stdio: "ignore",
        windowsHide: true,
      });
      serverChild.on("error", () => {});
      for (let i = 0; i < 80; i += 1) {
        await sleep(250);
        if (await probeServer()) return true;
      }
      return false;
    })().finally(() => {
      serverPromise = null;
    });
  }
  return serverPromise;
}

function createPetWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const initialX = workArea.x + workArea.width - PET_W - 48;
  const initialY = workArea.y + workArea.height - PET_H - 6;

  petWin = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    x: initialX,
    y: initialY,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  petWin.setAlwaysOnTop(true, "screen-saver");
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWin.loadFile(PET_FILE);

  petWin.once("ready-to-show", () => {
    if (petWin.isMaximized()) petWin.unmaximize();
    petWin.setBounds({
      x: initialX,
      y: initialY,
      width: PET_W,
      height: PET_H,
    });
    log("pet ready-to-show", petWin.getBounds());
    petWin.showInactive();
    scheduleWalk(2500);
  });

  petWin.webContents.on("did-finish-load", () => log("pet did-finish-load"));
  petWin.webContents.on("did-fail-load", (_event, code, description) =>
    log("pet did-fail-load", code, description),
  );
  petWin.webContents.on("console-message", (_event, level, message) =>
    log("pet console", level, message),
  );

  petWin.webContents.on("render-process-gone", (_event, details) => {
    console.error("pet renderer gone", details.reason);
  });

  petWin.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      hidePet();
    }
  });

  petWin.on("closed", () => {
    petWin = null;
  });
}

function createPanel() {
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(468, Math.max(360, area.width - 40));
  const height = Math.min(840, Math.max(480, area.height - 60));

  panelWin = new BrowserWindow({
    width,
    height,
    minWidth: 360,
    minHeight: 480,
    show: false,
    title: "人生支线小精灵",
    autoHideMenuBar: true,
    backgroundColor: "#FAF4E8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panelWin.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      panelWin.hide();
    }
  });

  panelWin.on("hide", () => {
    if (!quitting) say("回来了？");
  });

  panelWin.on("closed", () => {
    panelWin = null;
  });
}

async function openPanel(action = "input") {
  log("open-panel", action);
  const ready = await ensureServer();
  if (!ready) {
    dialog.showErrorBox("支线面板启动失败", "本地服务没有起来，请检查终端里的报错。");
    return;
  }

  if (!panelWin || panelWin.isDestroyed()) createPanel();

  if (panelWin.isVisible() && !panelWin.isMinimized()) {
    panelWin.focus();
    const label =
      action === "complete" ? "我完成了" : action === "growth" ? "看看成长" : "派支线";
    try {
      await panelWin.webContents.executeJavaScript(
        `(() => {
          const button = [...document.querySelectorAll("button")].find((node) =>
            (node.textContent || "").includes(${JSON.stringify(label)})
          );
          if (button) { button.click(); return true; }
          return false;
        })()`,
      );
    } catch {}
    say(action === "growth" ? "看看你这几天的账。" : "去吧，挑一条。");
    return;
  }

  const params = new URLSearchParams({ desktop: "1" });
  if (action) params.set("action", action);
  await panelWin.loadURL(`${APP_URL}/?${params.toString()}`);
  log("panel-loaded", panelWin.getBounds());

  if (panelWin.isMinimized()) panelWin.restore();
  panelWin.show();
  panelWin.focus();
  say("去吧，挑一条。");
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: "派支线…", click: () => openPanel("input") },
    { label: "我完成了…", click: () => openPanel("complete") },
    { label: "看看成长…", click: () => openPanel("growth") },
    { type: "separator" },
    {
      label: "跟随鼠标",
      type: "checkbox",
      checked: following,
      click: (item) => setFollowing(item.checked),
    },
    {
      label: "散个步",
      click: () => {
        if (following) setFollowing(false);
        showPet();
        walkOnce(true);
      },
    },
    { label: "回到右下角", click: () => resetPetPosition() },
    { label: "重启（应用新 Key）", click: () => relaunchApp() },
    { type: "separator" },
    {
      label: petHidden ? "显示宠物" : "隐藏宠物",
      click: () => (petHidden ? showPet() : hidePet()),
    },
    { type: "separator" },
    { label: "退出", click: () => quitApp() },
  ]);
}

function rebuildTray() {
  if (tray) tray.setContextMenu(buildMenu());
}

function createTray() {
  let icon;
  try {
    icon = nativeImage.createFromPath(TRAY_ICON);
    if (icon.isEmpty()) icon = undefined;
  } catch {
    icon = undefined;
  }
  tray = new Tray(icon || nativeImage.createEmpty());
  tray.setToolTip("人生支线小精灵");
  tray.setContextMenu(buildMenu());
  tray.on("click", () => (petHidden ? showPet() : hidePet()));
}

function hidePet() {
  petHidden = true;
  cancelWalk();
  if (petWin && !petWin.isDestroyed()) petWin.hide();
  rebuildTray();
}

function showPet() {
  petHidden = false;
  if (!petWin || petWin.isDestroyed()) {
    createPetWindow();
  } else {
    petWin.showInactive();
  }
  scheduleWalk(2200);
  rebuildTray();
}

function resetPetPosition() {
  if (!petWin || petWin.isDestroyed()) return;
  if (petHidden) showPet();
  const area = screen.getPrimaryDisplay().workArea;
  if (petWin.isMaximized()) petWin.unmaximize();
  petWin.setBounds({
    x: area.x + area.width - PET_W - 48,
    y: area.y + area.height - PET_H - 6,
    width: PET_W,
    height: PET_H,
  });
  log("reset-position", petWin.getBounds());
  scheduleWalk(2500);
  say("回来了。");
}

function keepOnScreen() {
  if (!petWin || petWin.isDestroyed() || petHidden) return;
  if (petWin.isMaximized()) petWin.unmaximize();
  const bounds = petWin.getBounds();
  const sizeBroken = bounds.width !== PET_W || bounds.height !== PET_H;
  const display = sizeBroken
    ? screen.getPrimaryDisplay()
    : screen.getDisplayNearestPoint({
        x: bounds.x + PET_W / 2,
        y: bounds.y + PET_H / 2,
      });
  const area = display.workArea;
  const minX = area.x + 10;
  const minY = area.y + 10;
  const maxX = Math.max(minX, area.x + area.width - PET_W - 10);
  const maxY = Math.max(minY, area.y + area.height - PET_H - 10);
  const nextX = clamp(bounds.x, minX, maxX);
  const nextY = clamp(bounds.y, minY, maxY);
  if (sizeBroken || nextX !== bounds.x || nextY !== bounds.y) {
    petWin.setBounds({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: PET_W,
      height: PET_H,
    });
    log("keep-on-screen", petWin.getBounds());
  }
}

function relaunchApp() {
  quitting = true;
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {}
  }
  app.relaunch({ execPath: process.execPath, args: ["--no-sandbox", ROOT] });
  app.exit(0);
}

function say(text) {
  send("pet:bubble", { text });
}

function movePet(x, y) {
  if (!petWin || petWin.isDestroyed()) return;
  petWin.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: PET_W,
    height: PET_H,
  });
}

function cancelWalk() {
  if (walkTimer) {
    clearTimeout(walkTimer);
    walkTimer = null;
  }
  if (walkAnim) {
    clearInterval(walkAnim);
    walkAnim = null;
  }
  send("pet:idle");
}

function scheduleWalk(delay) {
  if (process.env.PET_NOWALK === "1") return;
  if (walkTimer) clearTimeout(walkTimer);
  if (following || petHidden || !petWin) return;
  const wait = delay ?? 7000 + Math.random() * 8000;
  walkTimer = setTimeout(() => {
    walkTimer = null;
    walkOnce(false);
  }, wait);
}

function walkOnce(manual = false) {
  if (!petWin || petWin.isDestroyed() || dragging || following || petHidden) {
    if (manual && !following) showPet();
    return;
  }

  const [x, y] = petWin.getPosition();
  const display = screen.getDisplayNearestPoint({ x: x + PET_W / 2, y: y + PET_H / 2 });
  const area = display.workArea;
  const minX = area.x + 20;
  const maxX = Math.max(minX, area.x + area.width - PET_W - 40);

  const direction = Math.random() < 0.5 ? -1 : 1;
  let target = x + direction * (90 + Math.random() * 220);
  target = clamp(target, minX, maxX);
  if (Math.abs(target - x) < 30) {
    target = clamp(x - direction * 140, minX, maxX);
  }
  if (Math.abs(target - x) < 10) {
    scheduleWalk(6000);
    return;
  }

  const duration = clamp(1200 + Math.abs(target - x) * 3.4, 1200, 3600);
  const from = x;
  const start = Date.now();

  cancelWalk();
  send("pet:walk", { direction: target > x ? 1 : -1 });

  walkAnim = setInterval(() => {
    if (!petWin || petWin.isDestroyed() || dragging || following || petHidden) {
      clearInterval(walkAnim);
      walkAnim = null;
      send("pet:idle");
      return;
    }
    const progress = Math.min(1, (Date.now() - start) / duration);
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    movePet(from + (target - from) * eased, y);
    if (progress >= 1) {
      clearInterval(walkAnim);
      walkAnim = null;
      send("pet:idle");
      scheduleWalk(4500 + Math.random() * 8000);
    }
  }, 16);
}

function startFollowLoop() {
  if (followTimer) clearInterval(followTimer);
  followTimer = setInterval(() => {
    if (!petWin || petWin.isDestroyed() || !following || dragging || petHidden) return;
    const cursor = screen.getCursorScreenPoint();
    const [x, y] = petWin.getPosition();
    const display = screen.getDisplayNearestPoint(cursor);
    const area = display.workArea;
    const minX = area.x + 10;
    const minY = area.y + 10;
    const maxX = Math.max(minX, area.x + area.width - PET_W - 10);
    const maxY = Math.max(minY, area.y + area.height - PET_H - 10);
    const targetX = clamp(cursor.x + 64, minX, maxX);
    const targetY = clamp(cursor.y + 56, minY, maxY);
    const nextX = x + (targetX - x) * 0.14;
    const nextY = y + (targetY - y) * 0.14;
    if (Math.abs(nextX - x) > 0.4 || Math.abs(nextY - y) > 0.4) {
      movePet(nextX, nextY);
    }
  }, 33);
}

function setFollowing(value) {
  following = Boolean(value);
  if (following) {
    if (walkTimer) {
      clearTimeout(walkTimer);
      walkTimer = null;
    }
    if (walkAnim) {
      clearInterval(walkAnim);
      walkAnim = null;
    }
    send("pet:follow", { on: true });
    startFollowLoop();
  } else {
    if (followTimer) {
      clearInterval(followTimer);
      followTimer = null;
    }
    send("pet:follow", { on: false });
    scheduleWalk(2500);
  }
  rebuildTray();
}

function startDrag() {
  if (!petWin || petWin.isDestroyed()) return;
  cancelWalk();
  const cursor = screen.getCursorScreenPoint();
  const [x, y] = petWin.getPosition();
  dragOffset = { x: cursor.x - x, y: cursor.y - y };
  dragStart = cursor;
  dragDistance = 0;
  dragging = true;
  send("pet:state", { dragging: true });

  if (dragTimer) clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    if (!petWin || petWin.isDestroyed() || !dragging) return;
    const point = screen.getCursorScreenPoint();
    dragDistance = Math.max(
      dragDistance,
      Math.hypot(point.x - dragStart.x, point.y - dragStart.y),
    );
    const area = screen.getDisplayNearestPoint(point).workArea;
    const minX = area.x + 10;
    const minY = area.y + 10;
    const maxX = Math.max(minX, area.x + area.width - PET_W - 10);
    const maxY = Math.max(minY, area.y + area.height - PET_H - 10);
    const nextX = clamp(point.x - dragOffset.x, minX, maxX);
    const nextY = clamp(point.y - dragOffset.y, minY, maxY);
    movePet(nextX, nextY);
  }, 16);
}

function endDrag() {
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
  dragging = false;
  send("pet:state", { dragging: false });
  const distance = dragDistance;
  dragDistance = 0;
  if (!following) scheduleWalk(3500);
  return { distance };
}

function quitApp() {
  quitting = true;
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {}
  }
  app.quit();
}

ipcMain.on("pet:log", (_event, message) => {
  if (DEBUG) log("renderer", message);
});

ipcMain.on("pet:drag-start", () => startDrag());
ipcMain.handle("pet:drag-end", () => endDrag());

ipcMain.on("pet:menu", () => {
  log("menu");
  if (!petWin || petWin.isDestroyed()) return;
  petWin.focus();
  const menu = buildMenu();
  menu.popup({ window: petWin });
});

ipcMain.on("pet:open", (_event, action) => openPanel(action || "input"));
ipcMain.on("pet:quit", () => quitApp());
ipcMain.on("pet:follow", (_event, value) => setFollowing(value));
ipcMain.on("pet:walk", () => walkOnce(true));

ipcMain.handle("pet:talk", async (_event, payload) => {
  try {
    const response = await fetch(`${APP_URL}/api/talk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene: payload?.scene || "idle",
        mood: payload?.mood || "normal",
        inspiration: 3,
        completions: 0,
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.text === "string" ? data.text : null;
  } catch {
    return null;
  }
});

async function runTest() {
  try {
    log("test start");
    await ensureServer();
    log("test server ready");

    const walkFrom = petWin.getPosition();
    walkOnce(true);
    await sleep(2600);
    const walkTo = petWin.getPosition();
    log("walk", walkFrom, walkTo, `dx=${walkTo[0] - walkFrom[0]}`);

    const followFrom = petWin.getPosition();
    setFollowing(true);
    await sleep(1800);
    const followTo = petWin.getPosition();
    log(
      "follow",
      followFrom,
      followTo,
      `dx=${followTo[0] - followFrom[0]} dy=${followTo[1] - followFrom[1]}`,
      `cursor=${JSON.stringify(screen.getCursorScreenPoint())}`,
    );
    setFollowing(false);

    const dragFrom = petWin.getPosition();
    const originalGetCursor = screen.getCursorScreenPoint;
    let fakeCursor = { x: dragFrom[0] + 120, y: dragFrom[1] + 150 };
    let dragResult = { distance: 0 };
    try {
      screen.getCursorScreenPoint = () => fakeCursor;
      startDrag();
      await sleep(150);
      log("drag-started", petWin.getPosition());
      fakeCursor = { x: fakeCursor.x - 100, y: fakeCursor.y - 80 };
      await sleep(700);
      dragResult = endDrag();
    } catch (error) {
      log("drag-test-error", error?.message || String(error));
      try {
        endDrag();
      } catch {}
    } finally {
      screen.getCursorScreenPoint = originalGetCursor;
    }
    const dragTo = petWin.getPosition();
    log(
      "drag",
      dragFrom,
      dragTo,
      `dx=${dragTo[0] - dragFrom[0]} dy=${dragTo[1] - dragFrom[1]} distance=${dragResult.distance}`,
    );

    await petWin.webContents.insertCSS("html,body{background:#EFE6D6 !important}");
    send("pet:bubble", { text: "点我，派条支线。" });
    await sleep(450);
    const petImage = await petWin.webContents.capturePage();
    fs.writeFileSync(path.join(ROOT, "shots", "desktop-pet.png"), petImage.toPNG());
    console.log("PET_SHOT");
    log("PET_SHOT");
    await openPanel("input");
    await sleep(3500);
    const panelImage = await panelWin.webContents.capturePage();
    fs.writeFileSync(path.join(ROOT, "shots", "desktop-panel.png"), panelImage.toPNG());
    console.log("PANEL_SHOT");
    log("PANEL_SHOT");
  } catch (error) {
    console.error("PET_TEST_ERROR", error);
    log("PET_TEST_ERROR", error?.stack || String(error));
  }
  quitting = true;
  app.quit();
}

app.whenReady().then(async () => {
  if (!hasLock) return;
  log("app ready");
  try {
    createPetWindow();
    log("pet window created");
    createTray();
    log("tray created");
    setInterval(keepOnScreen, 1500);
    ensureServer();
    app.on("activate", () => showPet());

    if (process.env.PET_TEST === "1") {
      setTimeout(runTest, 2800);
    }
  } catch (error) {
    log("READY_ERROR", error?.stack || String(error));
    throw error;
  }
});

app.on("window-all-closed", () => {
  // 桌宠常驻托盘，不随窗口关闭退出。
});

app.on("before-quit", () => {
  quitting = true;
  if (serverChild) {
    try {
      serverChild.kill();
    } catch {}
  }
});
