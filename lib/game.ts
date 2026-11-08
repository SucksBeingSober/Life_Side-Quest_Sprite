import type { CompletionRecord, GameState, Mission } from "./types";
import { RARITY_EXP } from "./types";

export const LEVEL_STEPS = [0, 30, 80, 150, 240] as const;
export const MAX_LEVEL = 5;
export const MAX_INSPIRATION = 3;
export const STORAGE_KEY = "spirit.state.v1";
export const HISTORY_LIMIT = 7;

export function levelFor(exp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_STEPS.length; i += 1) {
    if (exp >= LEVEL_STEPS[i]) level = i + 1;
  }
  return Math.min(level, MAX_LEVEL);
}

export function levelProgress(exp: number): {
  level: number;
  base: number;
  next: number | null;
  percent: number;
} {
  const level = levelFor(exp);
  const base = LEVEL_STEPS[level - 1] ?? 0;
  const next = level >= MAX_LEVEL ? null : LEVEL_STEPS[level] ?? null;
  const percent =
    next === null ? 100 : Math.max(0, Math.min(100, ((exp - base) / (next - base)) * 100));
  return { level, base, next, percent };
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function newId(prefix = "m"): string {
  const raw =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${raw.slice(0, 8)}`;
}

export function defaultState(): GameState {
  return {
    exp: 0,
    inspiration: MAX_INSPIRATION,
    completions: 0,
    mood: "normal",
    city: "上海",
    activeMission: null,
    settledIds: [],
    recentTitles: [],
    lastResetDate: todayKey(),
    history: [],
  };
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function boolArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

function sanitizeMission(value: unknown): Mission | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (typeof m.title !== "string" || !m.title.trim()) return null;
  const steps = Array.isArray(m.steps)
    ? m.steps.filter((s): s is string => typeof s === "string").slice(0, 4)
    : [];
  const tags = Array.isArray(m.tags)
    ? m.tags.filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];
  return {
    id: str(m.id) || newId(),
    title: m.title.slice(0, 12),
    rarity: m.rarity === "稀有" || m.rarity === "离谱" ? m.rarity : "普通",
    tags,
    summary: str(m.summary).slice(0, 40),
    steps,
    duration_minutes: num(m.duration_minutes, 15),
    estimated_cost: num(m.estimated_cost, 0),
    fallback: str(m.fallback).slice(0, 30),
  };
}

function sanitizeRecord(value: unknown): CompletionRecord | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.award !== "string" || typeof r.missionTitle !== "string") return null;
  return {
    id: str(r.id) || newId("r"),
    missionTitle: r.missionTitle.slice(0, 20),
    award: r.award.slice(0, 10),
    rarity: r.rarity === "稀有" || r.rarity === "离谱" ? r.rarity : "普通",
    exp: num(r.exp, 10),
    at: num(r.at, Date.now()),
    shareText: str(r.shareText).slice(0, 60),
    reaction: str(r.reaction, str(r.shareText)).slice(0, 60),
    reflection: typeof r.reflection === "string" ? r.reflection.slice(0, 60) : undefined,
    level: Math.max(1, Math.min(MAX_LEVEL, num(r.level, 1))),
    inspiration: Math.max(0, Math.min(MAX_INSPIRATION, num(r.inspiration, 1))),
    index: Math.max(1, num(r.index, 1)),
    totalExp: Math.max(0, num(r.totalExp, num(r.exp, 10))),
  };
}

export function loadState(): GameState {
  const base = defaultState();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return base;

    const state: GameState = {
      exp: Math.max(0, num(parsed.exp, 0)),
      inspiration: Math.max(0, Math.min(MAX_INSPIRATION, num(parsed.inspiration, MAX_INSPIRATION))),
      completions: Math.max(0, num(parsed.completions, 0)),
      mood:
        parsed.mood === "happy" ||
        parsed.mood === "normal" ||
        parsed.mood === "lazy" ||
        parsed.mood === "annoyed"
          ? parsed.mood
          : "normal",
      city: str(parsed.city, "上海").trim().slice(0, 20) || "上海",
      activeMission: sanitizeMission(parsed.activeMission),
      settledIds: boolArray(parsed.settledIds).slice(-60),
      recentTitles: boolArray(parsed.recentTitles).slice(0, HISTORY_LIMIT),
      lastResetDate: str(parsed.lastResetDate, todayKey()),
      history: Array.isArray(parsed.history)
        ? parsed.history
            .map(sanitizeRecord)
            .filter((r): r is CompletionRecord => Boolean(r))
            .slice(0, HISTORY_LIMIT)
        : [],
    };

    if (state.lastResetDate !== todayKey()) {
      state.inspiration = MAX_INSPIRATION;
      state.lastResetDate = todayKey();
    }
    return state;
  } catch {
    return base;
  }
}

export function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式或空间不足时静默失败，不影响使用 */
  }
}

export function applyCompletion(
  state: GameState,
  payload: {
    mission: Mission;
    award: string;
    shareText: string;
    reflection?: string;
    reaction: string;
  },
): { state: GameState; record: CompletionRecord; expGain: number; levelBefore: number; levelAfter: number } {
  const expGain = RARITY_EXP[payload.mission.rarity] ?? 10;
  const levelBefore = levelFor(state.exp);
  const totalExp = state.exp + expGain;
  const levelAfter = levelFor(totalExp);
  const inspiration = Math.min(MAX_INSPIRATION, state.inspiration + 1);
  const record: CompletionRecord = {
    id: newId("r"),
    missionTitle: payload.mission.title,
    award: payload.award,
    rarity: payload.mission.rarity,
    exp: expGain,
    at: Date.now(),
    shareText: payload.shareText,
    reaction: payload.reaction,
    reflection: payload.reflection?.trim() || undefined,
    level: levelAfter,
    inspiration,
    index: state.completions + 1,
    totalExp,
  };

  return {
    state: {
      ...state,
      exp: totalExp,
      inspiration,
      completions: state.completions + 1,
      activeMission: null,
      settledIds: [...state.settledIds, payload.mission.id].slice(-60),
      recentTitles: [payload.mission.title, ...state.recentTitles].slice(0, HISTORY_LIMIT),
      history: [record, ...state.history].slice(0, HISTORY_LIMIT),
    },
    record,
    expGain,
    levelBefore,
    levelAfter,
  };
}
