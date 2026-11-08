const APP = process.env.BASE || "http://127.0.0.1:3100";
const MOCK = "http://127.0.0.1:3200";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(ok ? "PASS" : "FAIL", name, detail);
}

async function control(mode) {
  await fetch(`${MOCK}/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, reset: true }),
  });
}

async function stats() {
  return fetch(`${MOCK}/stats`).then((r) => r.json());
}

async function post(path, body) {
  const response = await fetch(`${APP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

const missionBody = { mood: "normal", time: 15, budget: 0, note: "", free: false, exclude: [] };

await control("valid");
let r = await post("/api/missions", missionBody);
check("AI 派发成功", r.data?.source === "ai", r.data?.source);
check("AI 派发 3 条", r.data?.missions?.length === 3, String(r.data?.missions?.length));
check("AI 派发内容", r.data?.missions?.[0]?.title === "测试支线一", r.data?.missions?.[0]?.title);

r = await post("/api/talk", { scene: "opening", mood: "normal", inspiration: 3 });
check("AI 说话", r.data?.source === "ai" && r.data?.text === "测试台词。", r.data?.source);

r = await post("/api/settle", { missionTitle: "测试支线一", rarity: "普通", reflection: "" });
check("AI 结算", r.data?.source === "ai", r.data?.source);
check("AI 结算字段", r.data?.title === "测试称号", r.data?.title);

await control("retry-once");
r = await post("/api/missions", missionBody);
check("第一次坏 JSON 后重试成功", r.data?.source === "ai", r.data?.source);
check("重试调用 2 次", (await stats()).counts.missions === 2, String((await stats()).counts.missions));

await control("bad-schema");
r = await post("/api/missions", missionBody);
check("Schema 失败兜底", r.data?.source === "fallback", r.data?.source);
check("兜底 3 条", r.data?.missions?.length === 3, String(r.data?.missions?.length));
check("兜底仍守预算", r.data?.missions?.every((m) => m.estimated_cost === 0), "");

await control("over-budget");
r = await post("/api/missions", missionBody);
check("超预算触发兜底", r.data?.source === "fallback", r.data?.source);
check("超预算兜底 0 元", r.data?.missions?.every((m) => m.estimated_cost === 0), "");
check("预算违规调用 2 次", (await stats()).counts.missions === 2, String((await stats()).counts.missions));

await control("fabrication");
r = await post("/api/settle", { missionTitle: "测试支线一", rarity: "普通", reflection: "" });
check("编造细节被拦截", r.data?.source === "fallback", r.data?.source);
check("兜底不编造", !/你(看到|走进|遇到)/.test(r.data?.reaction ?? ""), r.data?.reaction);
check("结算重试 2 次", (await stats()).counts.settle === 2, String((await stats()).counts.settle));

const failed = results.filter((item) => !item.ok);
console.log(`PASS ${results.length - failed.length} / FAIL ${failed.length}`);
process.exit(failed.length ? 1 : 0);
