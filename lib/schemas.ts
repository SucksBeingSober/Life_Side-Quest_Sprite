import { z } from "zod";
import type { Mission, MissionRequest, Rarity, Settlement } from "./types";

export const TAGS = ["独处", "社交", "户外", "室内", "动手", "观察", "运动", "治愈", "脑洞"] as const;

export const TalkSchema = z
  .object({
    mood: z.enum(["smug", "soft", "bored", "proud"]),
    text: z.string().trim().min(1).max(50),
  })
  .strict();

export const MissionSchema = z
  .object({
    id: z.string().min(1).max(40),
    title: z.string().trim().min(2).max(12),
    rarity: z.enum(["普通", "稀有", "离谱"]),
    tags: z.array(z.enum(TAGS)).min(1).max(3),
    summary: z.string().trim().min(10).max(40),
    steps: z.array(z.string().trim().min(4).max(20)).min(2).max(4),
    duration_minutes: z.number().int().min(5).max(120),
    estimated_cost: z.number().int().min(0).max(200),
    fallback: z.string().trim().min(5).max(30),
  })
  .strict();

export const MissionBatchSchema = z
  .object({
    missions: z.array(MissionSchema).length(3),
  })
  .strict();

export const SettlementSchema = z
  .object({
    title: z.string().trim().min(2).max(10),
    reaction: z.string().trim().min(4).max(60),
    share_text: z.string().trim().min(10).max(50),
  })
  .strict();

export const MissionRequestSchema = z
  .object({
    mood: z.enum(["happy", "normal", "lazy", "annoyed"]),
    time: z.union([z.literal(15), z.literal(30), z.literal(60)]),
    budget: z.union([z.literal(0), z.literal(20), z.literal(50), z.literal(999)]),
    note: z.string().max(80).optional(),
    free: z.boolean().optional(),
    exclude: z.array(z.string().max(20)).max(10).optional(),
    city: z.string().max(20).optional(),
    weather: z.string().max(60).optional(),
    weather_code: z.number().int().min(0).max(99).optional(),
    temperature: z.number().min(-60).max(60).optional(),
    precipitation: z.number().min(0).max(100).optional(),
  })
  .strict();

const SPEND_WORDS = /[买付元¥￥]|门票|咖啡|奶茶|打车|团购|消费|花钱|充值/;

export function countSentences(text: string): number {
  return text
    .split(/[。！？!?…]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function checkTalk(text: string): string | null {
  if (/[\n\r]/.test(text)) return "text 不能有换行";
  if (countSentences(text) > 2) return "text 超过 2 句";
  if (Array.from(text).length > 50) return "text 超过 50 字";
  return null;
}

export function checkMissionBatch(missions: Mission[], req: MissionRequest): string | null {
  if (missions.length !== 3) return "必须正好 3 条支线";

  const titles = new Set<string>();
  const tags = new Set<string>();
  let wild = 0;

  for (const mission of missions) {
    if (titles.has(mission.title)) return `标题重复：${mission.title}`;
    titles.add(mission.title);
    mission.tags.forEach((t) => tags.add(t));

    if (mission.duration_minutes > req.time) {
      return `「${mission.title}」时长 ${mission.duration_minutes} 分钟超过 ${req.time} 分钟`;
    }
    if (req.budget !== 999 && mission.estimated_cost > req.budget) {
      return `「${mission.title}」花费 ${mission.estimated_cost} 元超过预算 ${req.budget} 元`;
    }
    if (req.budget === 0) {
      if (mission.estimated_cost !== 0) return `预算为 0，但「${mission.title}」要花钱`;
      const text = [mission.title, mission.summary, ...mission.steps, mission.fallback].join(" ");
      const hit = text.match(SPEND_WORDS);
      if (hit) return `预算为 0，但「${mission.title}」出现消费词「${hit[0]}」`;
    }
    if (mission.rarity === "离谱") {
      wild += 1;
      if (req.time < 30) return "时间不足 30 分钟时不允许出现「离谱」支线";
    }
    if (req.exclude?.includes(mission.title)) {
      return `「${mission.title}」是用户最近做过的，请换一条`;
    }
  }

  if (wild > 1) return "「离谱」支线最多 1 条";
  if (tags.size < 2) return "3 条支线的标签太单一，至少 2 种";

  const wet =
    (req.weather_code ?? 0) >= 51 ||
    (req.precipitation ?? 0) >= 60 ||
    /雨|雪|雷/.test(req.weather ?? "");
  if (wet && missions.filter((mission) => mission.tags.includes("户外")).length > 1) {
    return "今天有雨雪，最多 1 条户外，请至少换 2 条室内";
  }

  return null;
}

const FABRICATION = /你(看到|看见|遇到|走进|闻到|听到|摸到|和.{0,6}(?:聊|说)|去了|到了|认识了)/;

export function checkSettlement(
  settlement: Settlement,
  input: { missionTitle: string; reflection?: string },
): string | null {
  if (countSentences(settlement.reaction) > 2) return "reaction 超过 2 句";
  if (/[\n\r]/.test(settlement.reaction)) return "reaction 不能有换行";
  if (/https?:\/\/|#\S|@\S/.test(settlement.share_text)) {
    return "share_text 不能带链接、话题标签或 @";
  }
  if (!input.reflection?.trim() && FABRICATION.test(settlement.reaction)) {
    return "用户没写感受，reaction 不能编造具体场景、人物或对话";
  }
  if (Array.from(settlement.title).length > 10) return "title 超过 10 字";
  if (Array.from(settlement.share_text).length > 50) return "share_text 超过 50 字";
  return null;
}

export function normalizeMissions(missions: Mission[]): Mission[] {
  return missions.slice(0, 3).map((m) => ({
    ...m,
    id: `m_${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`,
    title: m.title.trim().slice(0, 12),
    summary: m.summary.trim().slice(0, 40),
    steps: m.steps.map((s) => s.trim().slice(0, 20)).slice(0, 4),
    fallback: m.fallback.trim().slice(0, 30),
    tags: m.tags.slice(0, 3),
  }));
}

export function normalizeSettlement(settlement: Settlement): Settlement {
  return {
    title: settlement.title.trim().slice(0, 10),
    reaction: settlement.reaction.trim().slice(0, 60),
    share_text: settlement.share_text.trim().slice(0, 50),
  };
}

export function rarityOf(value: unknown): Rarity {
  return value === "稀有" || value === "离谱" ? value : "普通";
}
