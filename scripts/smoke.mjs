const BASE = process.env.BASE || "http://127.0.0.1:3100";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
}

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

const page = await fetch(`${BASE}/`);
const html = await page.text();
check("首页 200", page.status === 200, String(page.status));
check("首页标题", html.includes("人生支线小精灵"), "");
check("首页含骨架", html.includes("正在醒来"), "");

const talk = await post("/api/talk", { scene: "opening", mood: "normal", inspiration: 3 });
check("talk 200", talk.status === 200, String(talk.status));
check("talk 结构", typeof talk.data?.text === "string" && typeof talk.data?.mood === "string", talk.data?.text);
check("talk 句数", (talk.data?.text.match(/[。！？…]/g) || []).length <= 2, talk.data?.text);

const combos = [
  { mood: "lazy", time: 15, budget: 0 },
  { mood: "happy", time: 30, budget: 20 },
  { mood: "normal", time: 60, budget: 50 },
  { mood: "annoyed", time: 15, budget: 0 },
];

for (const combo of combos) {
  const response = await post("/api/missions", { ...combo, withNote: undefined, note: "", free: false, exclude: [] });
  const missions = response.data?.missions ?? [];
  const label = `${combo.time}min/${combo.budget}y`;
  check(`missions ${label} 200`, response.status === 200, String(response.status));
  check(`missions ${label} 数量`, missions.length === 3, String(missions.length));
  check(
    `missions ${label} 时长`,
    missions.every((m) => m.duration_minutes <= combo.time),
    missions.map((m) => m.duration_minutes).join(","),
  );
  check(
    `missions ${label} 预算`,
    missions.every((m) => combo.budget === 999 || m.estimated_cost <= combo.budget),
    missions.map((m) => m.estimated_cost).join(","),
  );
  check(`missions ${label} 标题唯一`, new Set(missions.map((m) => m.title)).size === 3, missions.map((m) => m.title).join("/"));
  const wildCount = missions.filter((m) => m.rarity === "离谱").length;
  check(
    `missions ${label} 离谱规则`,
    combo.time < 30 ? wildCount === 0 : wildCount <= 1,
    `wild=${wildCount}`,
  );
  check(
    `missions ${label} 字段长度`,
    missions.every(
      (m) =>
        m.title.length >= 2 &&
        m.title.length <= 12 &&
        m.summary.length >= 10 &&
        m.summary.length <= 40 &&
        m.fallback.length >= 5 &&
        m.fallback.length <= 30 &&
        m.steps.length >= 2 &&
        m.steps.length <= 4,
    ),
    "",
  );
  if (combo.budget === 0) {
    const spend = /[买付元¥￥]|门票|咖啡|奶茶|打车|团购|消费|花钱|充值/;
    const bad = missions.find((m) =>
      spend.test([m.title, m.summary, ...m.steps, m.fallback].join(" ")),
    );
    check(`missions ${label} 零消费`, !bad, bad ? bad.title : "ok");
  }
  results.push({ name: `sample ${label}`, ok: true, detail: missions.map((m) => `${m.rarity}:${m.title}`).join(" | ") });
}

const settleEmpty = await post("/api/settle", { missionTitle: "数七种颜色", rarity: "普通", reflection: "" });
check("settle 空感受 200", settleEmpty.status === 200, String(settleEmpty.status));
check("settle 空感受字段", Boolean(settleEmpty.data?.title && settleEmpty.data?.reaction && settleEmpty.data?.share_text), "");
check("settle 空感受不编造", !/你(看到|看见|遇到|走进|闻到|听到|和.{0,4}(聊|说))/.test(settleEmpty.data?.reaction ?? ""), settleEmpty.data?.reaction);

const settleWith = await post("/api/settle", {
  missionTitle: "数七种颜色",
  rarity: "稀有",
  reflection: "原来楼下有这么多橙色",
});
check("settle 有感受 200", settleWith.status === 200, String(settleWith.status));
check("settle 分享长度", (settleWith.data?.share_text ?? "").length <= 50, settleWith.data?.share_text);

const bad = await post("/api/missions", { mood: "lazy", time: 99, budget: 0 });
check("非法输入 400", bad.status === 400, String(bad.status));

const free = await post("/api/missions", { ...combos[0], note: "", free: true, exclude: [] });
const freeTitles = (free.data?.missions ?? []).map((m) => m.title);
check("免费保底 3 条", freeTitles.length === 3, freeTitles.join("/"));
check(
  "免费保底固定",
  ["喝杯水站一会", "看窗外一分钟", "伸个懒腰"].every((title) => freeTitles.includes(title)),
  freeTitles.join("/"),
);
check("免费保底不花钱", (free.data?.missions ?? []).every((m) => m.estimated_cost === 0), "");

const report = { base: BASE, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
await import("node:fs/promises").then((fs) => fs.writeFile("smoke-report.json", JSON.stringify(report, null, 2), "utf8"));
console.log(`PASS ${report.passed} / FAIL ${report.failed}`);
for (const item of results.filter((r) => !r.ok)) console.log("FAILED:", item.name, item.detail);
for (const item of results.filter((r) => r.name.startsWith("sample"))) console.log(item.detail);
