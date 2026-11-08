import { z } from "zod";
import { aiConfigured, callAIJSON } from "@/lib/ai";
import { cleanNote, clientIp, jsonResponse, rateLimit, readSmallJson } from "@/lib/http";
import { fallbackSettlement } from "@/lib/mock";
import { settleSystem } from "@/lib/prompts";
import { SettlementSchema, TAGS, checkSettlement, normalizeSettlement } from "@/lib/schemas";
import type { Rarity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SettleInput = z
  .object({
    missionTitle: z.string().min(1).max(20),
    rarity: z.enum(["普通", "稀有", "离谱"]),
    reflection: z.string().max(80).optional(),
    tags: z.array(z.enum(TAGS)).max(3).optional(),
  })
  .strict();

export async function POST(req: Request) {
  if (!rateLimit("settle", clientIp(req), 40, 3_600_000)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const raw = await readSmallJson(req, 2048);
  const parsed = SettleInput.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse({ error: "bad_request" }, 400);
  }

  const input: {
    missionTitle: string;
    rarity: Rarity;
    reflection?: string;
    tags?: string[];
  } = {
    missionTitle: cleanNote(parsed.data.missionTitle, 20),
    rarity: parsed.data.rarity,
    reflection: cleanNote(parsed.data.reflection, 40) || undefined,
    tags: parsed.data.tags,
  };

  const respondFallback = () =>
    jsonResponse({ ...fallbackSettlement(input), source: "fallback" });

  if (!aiConfigured()) return respondFallback();

  let fix: string | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callAIJSON({
      system: settleSystem(input, fix),
      user: JSON.stringify({
        mission_title: input.missionTitle,
        rarity: input.rarity,
        reflection: input.reflection || null,
        tags: input.tags ?? [],
      }),
      temperature: 0.7,
      maxTokens: 220,
      timeoutMs: 8000,
    });

    if (!result.data) {
      fix = result.reason === "timeout" ? "响应超时" : "返回内容不是合法 JSON";
      continue;
    }

    const settlement = SettlementSchema.safeParse(result.data);
    if (!settlement.success) {
      fix = "字段缺失或长度不符合 Schema";
      continue;
    }

    const problem = checkSettlement(settlement.data, input);
    if (problem) {
      fix = problem;
      continue;
    }

    return jsonResponse({ ...normalizeSettlement(settlement.data), source: "ai" });
  }

  return respondFallback();
}
