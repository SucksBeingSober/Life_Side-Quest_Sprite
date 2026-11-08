import { mkdir, readdir, writeFile } from "node:fs/promises";

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.BASE || "http://127.0.0.1:3100";
const OUT = "shots";

const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("about:blank")}`, {
  method: "PUT",
}).then((response) => response.json());

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let seq = 0;
const pending = new Map();
const events = new Map();

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
    return;
  }
  (events.get(message.method) || []).forEach((fn) => fn(message.params));
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function once(method, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout ${method}`)), timeout);
    const listener = (params) => {
      clearTimeout(timer);
      events.set(method, (events.get(method) || []).filter((fn) => fn !== listener));
      resolve(params);
    };
    events.set(method, [...(events.get(method) || []), listener]);
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(`${OUT}/${name}.png`, Buffer.from(data, "base64"));
  console.log("shot", name);
}

async function click(text) {
  const ok = await evaluate(`(() => {
    const el = [...document.querySelectorAll("button")].find((node) =>
      (node.textContent || "").includes(${JSON.stringify(text)})
    );
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!ok) throw new Error(`not found: ${text}`);
  await sleep(400);
}

async function clickSel(selector) {
  const ok = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
  if (!ok) throw new Error(`not found: ${selector}`);
  await sleep(400);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.bringToFront");
await send("Browser.grantPermissions", {
  origin: BASE,
  permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
});
await send("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: `${process.cwd()}\\shots\\downloads`,
  eventsEnabled: true,
});
await mkdir(`${OUT}/downloads`, { recursive: true });

async function mobileViewport() {
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
}

await mobileViewport();
const loaded = once("Page.loadEventFired");
await send("Page.navigate", { url: BASE });
await loaded;
await sleep(1800);
await evaluate(`localStorage.clear()`);
const reload = once("Page.loadEventFired");
await send("Page.reload");
await reload;
await sleep(1800);

check("首页渲染", await evaluate(`!!document.querySelector(".hero h1")`));
check("初始灵感 3", (await evaluate(`document.querySelectorAll(".insp i.on").length`)) === 3);

await click("派支线");
await click("派一条");
await sleep(1500);
check("支线卡 3 张", (await evaluate(`document.querySelectorAll(".mcard:not(.skeleton)").length`)) === 3);
const firstBatch = await evaluate(`[...document.querySelectorAll(".mcard-title")].map((n) => n.textContent)`);
check("灵感扣 1", (await evaluate(`document.querySelectorAll(".insp-static i.on").length`)) === 2, JSON.stringify(firstBatch));
await shot("11-cards");

await click("换一批");
await sleep(1400);
check("换一批扣灵感", (await evaluate(`document.querySelectorAll(".insp-static i.on").length`)) === 1);
const secondBatch = await evaluate(`[...document.querySelectorAll(".mcard-title")].map((n) => n.textContent)`);
check("换一批内容变化", JSON.stringify(firstBatch) !== JSON.stringify(secondBatch), JSON.stringify(secondBatch));

await clickSel(".cards-foot .btn-ghost");
await clickSel(".cards-foot .btn-ghost");
await sleep(1400);
check("灵感归零", (await evaluate(`document.querySelectorAll(".insp-static i.on").length`)) === 0);
check(
  "0 灵感禁用换一批",
  await evaluate(`document.querySelector(".cards-foot .btn-ghost").disabled`),
);

await clickSel(".screen-head .icon-btn");
await click("派支线");
const freeLabel = await evaluate(`document.querySelector(".sheet .btn-primary")?.textContent || ""`);
check("0 灵感保底文案", freeLabel.includes("保底") && freeLabel.includes("免费"), freeLabel);
await shot("12-free-sheet");
await click("领一条保底支线");
await sleep(1400);
check("保底不扣灵感", (await evaluate(`document.querySelectorAll(".insp-static i.on").length`)) === 0);

await click("就这条");
await sleep(500);
check("进入进行中", await evaluate(`!!document.querySelector(".active-card")`));
check("主界面灵感 0", (await evaluate(`document.querySelectorAll(".statusbar .insp i.on").length`)) === 0);

await click("派支线");
check(
  "灵感 0 且有进行中时锁定",
  await evaluate(`document.querySelector(".sheet .btn-primary")?.disabled`),
);
const lockedLabel = await evaluate(`document.querySelector(".sheet .btn-primary")?.textContent || ""`);
check("锁定文案", lockedLabel.includes("先完成"), lockedLabel);
await clickSel(".sheet .icon-btn");

await click("我完成了");
await click("跳过");
await sleep(2000);
check("结算弹层", await evaluate(`!!document.querySelector(".result")`));
check("经验 +20 或 +10", /\+\d+/.test(await evaluate(`document.querySelector(".result-stats b")?.textContent || ""`)));
const stored = await evaluate(`JSON.parse(localStorage.getItem("spirit.state.v1") || "null")`);
check("localStorage 已写入", stored?.history?.length === 1, JSON.stringify({ exp: stored?.exp, insp: stored?.inspiration, active: stored?.activeMission }));
check("完成后灵感恢复", stored?.inspiration === 1, String(stored?.inspiration));
await shot("13-result");

await click("看看成长卡");
await sleep(900);
check("成长卡画布", await evaluate(`!!document.querySelector(".card-frame canvas")`));
await shot("14-growth-fixed");

await click("保存图片");
await sleep(1500);
const files = await readdir(`${OUT}/downloads`);
check("导出 PNG", files.some((f) => f.endsWith(".png")), files.join(","));

await click("复制文案");
await sleep(600);
const copied = await evaluate(`navigator.clipboard.readText().catch(() => "")`);
check("复制文案", copied.includes("人生支线小精灵"), copied.slice(0, 40));

await clickSel(".growth-screen .screen-head .icon-btn");
const reload2 = once("Page.loadEventFired");
await send("Page.reload");
await reload2;
await sleep(1500);
check("刷新保留等级", (await evaluate(`document.querySelector(".statusbar .lv")?.textContent`)) === "Lv.1");
check("刷新无进行中", !(await evaluate(`!!document.querySelector(".active-card")`)));
check("看看成长可用", (await evaluate(`!!document.querySelector(".brand")`)));

// 桌面视图
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
  screenWidth: 1440,
  screenHeight: 900,
});
const reload3 = once("Page.loadEventFired");
await send("Page.reload");
await reload3;
await sleep(1200);
await shot("15-desktop-home");
const desktop = await evaluate(`(() => {
  const bar = document.querySelector(".actionbar").getBoundingClientRect();
  const dock = document.querySelector(".dock").getBoundingClientRect();
  return { innerWidth, scrollWidth: document.documentElement.scrollWidth, bar: {x: Math.round(bar.x), w: Math.round(bar.width)}, dock: {x: Math.round(dock.x), w: Math.round(dock.width)} };
})()`);
check("桌面无横向溢出", desktop.scrollWidth === desktop.innerWidth, JSON.stringify(desktop));

await click("看看成长");
await sleep(800);
await shot("16-desktop-growth");

const failed = results.filter((r) => !r.ok);
await writeFile(`${OUT}/e2e-report.json`, JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2), "utf8");
console.log(`PASS ${results.length - failed.length} / FAIL ${failed.length}`);
ws.close();
process.exit(failed.length ? 1 : 0);
