import http from "node:http";

let mode = "valid";
let counts = { missions: 0, settle: 0, talk: 0 };

const missions = {
  missions: [
    {
      id: "m_aaaaaaaa",
      title: "测试支线一",
      rarity: "普通",
      tags: ["观察", "户外"],
      summary: "这是第一条用于测试的合法支线内容。",
      steps: ["先做第一步", "再做第二步", "最后收尾"],
      duration_minutes: 10,
      estimated_cost: 0,
      fallback: "做不到就跳过。",
    },
    {
      id: "m_bbbbbbbb",
      title: "测试支线二",
      rarity: "稀有",
      tags: ["室内", "治愈"],
      summary: "这是第二条用于测试的合法支线内容。",
      steps: ["先做第一步", "再做第二步"],
      duration_minutes: 12,
      estimated_cost: 0,
      fallback: "做不到就少做一步。",
    },
    {
      id: "m_cccccccc",
      title: "测试支线三",
      rarity: "普通",
      tags: ["动手"],
      summary: "这是第三条用于测试的合法支线内容。",
      steps: ["先做第一步", "再做第二步"],
      duration_minutes: 8,
      estimated_cost: 0,
      fallback: "做不到就放着。",
    },
  ],
};

const overBudget = {
  missions: missions.missions.map((m) => ({ ...m, estimated_cost: 10 })),
};

const settlement = {
  title: "测试称号",
  reaction: "「测试支线一」完成了。行，记一笔。",
  share_text: "今天完成了一条测试支线。",
};

const fabricated = {
  title: "测试称号",
  reaction: "你走进那条小路，看到很多新鲜东西。",
  share_text: "今天完成了一条测试支线。",
};

function payloadFor(task) {
  if (task === "missions") {
    if (mode === "bad-json") return "这不是 JSON";
    if (mode === "bad-schema") return { missions: [{ title: "太短" }] };
    if (mode === "over-budget") return overBudget;
    return missions;
  }
  if (task === "settle") {
    if (mode === "fabrication") return fabricated;
    if (mode === "bad-schema") return { title: "x" };
    return settlement;
  }
  if (mode === "bad-json") return "nope";
  return { mood: "smug", text: "测试台词。" };
}

function taskOf(system) {
  if (system.includes("派发支线")) return "missions";
  if (system.includes("完成结算")) return "settle";
  return "talk";
}

const server = http.createServer((req, res) => {
  if (req.url === "/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        mode = data.mode || "valid";
        if (data.reset) counts = { missions: 0, settle: 0, talk: 0 };
      } catch {
        /* ignore */
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ mode, counts }));
    });
    return;
  }

  if (req.url === "/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ mode, counts }));
    return;
  }

  if (req.url?.endsWith("/chat/completions") && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = JSON.parse(body);
      const system = parsed.messages?.[0]?.content ?? "";
      const task = taskOf(system);
      counts[task] += 1;

      let content;
      if (mode === "retry-once" && task === "missions" && counts.missions === 1) {
        content = "第一次故意返回非 JSON";
      } else {
        const payload = payloadFor(task);
        content = typeof payload === "string" ? payload : JSON.stringify(payload);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(3200, "127.0.0.1", () => {
  console.log("MOCK AI READY http://127.0.0.1:3200/v1");
});
