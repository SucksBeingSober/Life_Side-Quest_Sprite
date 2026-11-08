import { aiConfigured, callAIJSON } from "@/lib/ai";
import { cleanNote, clientIp, jsonResponse, rateLimit, readSmallJson } from "@/lib/http";
import { buildGuaranteedMissions, buildMockMissions } from "@/lib/mock";
import { missionSystem } from "@/lib/prompts";
import {
  MissionBatchSchema,
  MissionRequestSchema,
  checkMissionBatch,
  normalizeMissions,
} from "@/lib/schemas";
import type { MissionRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!rateLimit("missions", clientIp(req), 40, 3_600_000)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const raw = await readSmallJson(req, 4096);
  const parsed = MissionRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "bad_request" }, 400);
  }

  const input: MissionRequest = {
    ...parsed.data,
    note: cleanNote(parsed.data.note),
    city: cleanNote(parsed.data.city, 20),
    weather: cleanNote(parsed.data.weather, 60),
    exclude: (parsed.data.exclude ?? []).map((t) => cleanNote(t, 20)).filter(Boolean).slice(0, 10),
  };

  const respondFallback = () =>
    jsonResponse({ missions: buildMockMissions(input), source: "fallback" });

  if (input.free) {
    return jsonResponse({ missions: buildGuaranteedMissions(), source: "fallback" });
  }
  if (!aiConfigured()) return respondFallback();

  let fix: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callAIJSON({
      system: missionSystem(input, fix),
      user: JSON.stringify({
        mood: input.mood,
        time_limit_minutes: input.time,
        budget_limit_yuan: input.budget,
        note: input.note || null,
        recent_titles: input.exclude ?? [],
        city: input.city || null,
        weather: input.weather || null,
        temperature: input.temperature ?? null,
        precipitation: input.precipitation ?? null,
      }),
      temperature: 0.9,
      maxTokens: 900,
      timeoutMs: 12000,
    });

    if (!result.data) {
      fix = result.reason === "timeout" ? "响应超时" : "返回内容不是合法 JSON";
      continue;
    }

    const batch = MissionBatchSchema.safeParse(result.data);
    if (!batch.success) {
      fix = "字段缺失或长度不符合 Schema";
      continue;
    }

    const problem = checkMissionBatch(batch.data.missions, input);
    if (problem) {
      fix = problem;
      continue;
    }

    return jsonResponse({ missions: normalizeMissions(batch.data.missions), source: "ai" });
  }

  return respondFallback();
}
