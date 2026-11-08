import { aiConfigured, callAIJSON } from "@/lib/ai";
import { clientIp, jsonResponse, rateLimit, readSmallJson } from "@/lib/http";
import { fallbackTalk } from "@/lib/mock";
import { talkSystem } from "@/lib/prompts";
import { TalkSchema, checkTalk } from "@/lib/schemas";
import type { Mood, Scene } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCENES: Scene[] = ["opening", "mission", "complete", "idle", "empty"];
const MOODS: Mood[] = ["happy", "normal", "lazy", "annoyed"];

export async function POST(req: Request) {
  if (!rateLimit("talk", clientIp(req), 120, 3_600_000)) {
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const raw = (await readSmallJson(req, 1024)) as {
    scene?: unknown;
    mood?: unknown;
    inspiration?: unknown;
    completions?: unknown;
  } | null;

  const scene: Scene = SCENES.includes(raw?.scene as Scene) ? (raw?.scene as Scene) : "idle";
  const mood: Mood = MOODS.includes(raw?.mood as Mood) ? (raw?.mood as Mood) : "normal";
  const inspiration = typeof raw?.inspiration === "number" ? raw.inspiration : 3;
  const completions =
    typeof raw?.completions === "number" ? Math.max(0, Math.min(999, raw.completions)) : 0;
  const effective: Scene = inspiration <= 0 && scene === "opening" ? "empty" : scene;

  if (!aiConfigured()) {
    return jsonResponse(fallbackTalk(effective, mood, completions));
  }

  const result = await callAIJSON({
    system: talkSystem(effective, mood, completions),
    user: JSON.stringify({ scene: effective, mood, completions }),
    temperature: 0.85,
    maxTokens: 120,
    timeoutMs: 1400,
  });

  const parsed = TalkSchema.safeParse(result.data);
  if (!parsed.success || checkTalk(parsed.data.text)) {
    return jsonResponse(fallbackTalk(effective, mood, completions));
  }

  return jsonResponse({ ...parsed.data, source: "ai" });
}
