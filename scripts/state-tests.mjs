const PORT = 9222;
const BASE = "http://127.0.0.1:3100";

const target = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("about:blank")}`, {
  method: "PUT",
}).then((r) => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let seq = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(ok ? "PASS" : "FAIL", name, detail);
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await send("Page.navigate", { url: BASE });
await sleep(1600);

const record = (i) => ({
  id: `r_${i}`,
  missionTitle: `旧支线${i}`,
  award: "旧称号",
  rarity: "普通",
  exp: 10,
  at: Date.now() - i * 1000,
  shareText: "旧文案",
  reaction: "旧反应",
  level: 1,
  inspiration: 3,
  index: i,
  totalExp: i * 10,
});

async function seed(value) {
  await evaluate(`localStorage.setItem("spirit.state.v1", ${JSON.stringify(JSON.stringify(value))})`);
  const loaded = new Promise((resolve) => {
    const handler = () => {
      ws.removeEventListener("message", listener);
      resolve();
    };
    const listener = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Page.loadEventFired") handler();
    };
    ws.addEventListener("message", listener);
  });
  await send("Page.reload");
  await loaded;
  await sleep(1500);
}

await seed({
  exp: 200,
  inspiration: 0,
  completions: 6,
  mood: "happy",
  activeMission: null,
  settledIds: [],
  recentTitles: [],
  lastResetDate: "2000-01-01",
  history: Array.from({ length: 10 }, (_, i) => record(i + 1)),
});
check("等级由经验推导 Lv.4", (await evaluate(`document.querySelector(".statusbar .lv")?.textContent`)) === "Lv.4");
check("跨天回满灵感", (await evaluate(`document.querySelectorAll(".statusbar .insp i.on").length`)) === 3);
const capped = await evaluate(`JSON.parse(localStorage.getItem("spirit.state.v1")).history.length`);
check("历史裁到 7 条", capped === 7, String(capped));

const today = new Date();
const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
await seed({
  exp: 0,
  inspiration: 0,
  completions: 0,
  mood: "normal",
  activeMission: null,
  settledIds: [],
  recentTitles: [],
  lastResetDate: key,
  history: [],
});
check("同一天不回满", (await evaluate(`document.querySelectorAll(".statusbar .insp i.on").length`)) === 0);

await seed({
  exp: 40,
  inspiration: 2,
  completions: 1,
  mood: "lazy",
  activeMission: {
    id: "m_persist1",
    title: "被记住的支线",
    rarity: "稀有",
    tags: ["观察"],
    summary: "这是一条刷新后仍然存在的支线。",
    steps: ["第一步", "第二步"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "跳过。",
  },
  settledIds: [],
  recentTitles: [],
  lastResetDate: key,
  history: [],
});
check("刷新保留进行中支线", (await evaluate(`document.querySelector(".active-title")?.textContent`)) === "被记住的支线");

await evaluate(`localStorage.setItem("spirit.state.v1", "{{{ 坏数据")`);
const loaded = new Promise((resolve) => {
  const listener = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Page.loadEventFired") {
      ws.removeEventListener("message", listener);
      resolve();
    }
  };
  ws.addEventListener("message", listener);
});
await send("Page.reload");
await loaded;
await sleep(1600);
check("坏数据不白屏", await evaluate(`!!document.querySelector(".hero h1")`));
check("坏数据回到默认", (await evaluate(`document.querySelector(".statusbar .lv")?.textContent`)) === "Lv.1");
check("坏数据默认 3 灵感", (await evaluate(`document.querySelectorAll(".statusbar .insp i.on").length`)) === 3);

await evaluate(`localStorage.clear()`);
const failed = results.filter((r) => !r.ok);
console.log(`PASS ${results.length - failed.length} / FAIL ${failed.length}`);
ws.close();
process.exit(failed.length ? 1 : 0);
