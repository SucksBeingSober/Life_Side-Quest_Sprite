export type Mood = "happy" | "normal" | "lazy" | "annoyed";
export type TimeLimit = 15 | 30 | 60;
export type BudgetLimit = 0 | 20 | 50 | 999;
export type Rarity = "普通" | "稀有" | "离谱";
export type SpriteMood = "smug" | "soft" | "bored" | "proud";
export type Scene = "opening" | "mission" | "complete" | "idle" | "empty";

export interface Mission {
  id: string;
  title: string;
  rarity: Rarity;
  tags: string[];
  summary: string;
  steps: string[];
  duration_minutes: number;
  estimated_cost: number;
  fallback: string;
}

export interface Settlement {
  title: string;
  reaction: string;
  share_text: string;
}

export interface MissionRequest {
  mood: Mood;
  time: TimeLimit;
  budget: BudgetLimit;
  note?: string;
  free?: boolean;
  exclude?: string[];
  city?: string;
  weather?: string;
  weather_code?: number;
  temperature?: number;
  precipitation?: number;
}

export interface WeatherInfo {
  city: string;
  weather: string;
  code: number;
  temperature: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  wind: number;
  isWet: boolean;
  isHot: boolean;
  isCold: boolean;
}

export interface CompletionRecord {
  id: string;
  missionTitle: string;
  award: string;
  rarity: Rarity;
  exp: number;
  at: number;
  shareText: string;
  reaction: string;
  reflection?: string;
  level: number;
  inspiration: number;
  index: number;
  totalExp: number;
}

export interface GameState {
  exp: number;
  inspiration: number;
  completions: number;
  mood: Mood;
  city: string;
  activeMission: Mission | null;
  settledIds: string[];
  recentTitles: string[];
  lastResetDate: string;
  history: CompletionRecord[];
}

export interface TalkResult {
  mood: SpriteMood;
  text: string;
  source: "ai" | "fallback";
}

export const MOODS: { id: Mood; label: string; emoji: string; note: string }[] = [
  { id: "happy", label: "开心", emoji: "☀️", note: "状态在线" },
  { id: "normal", label: "普通", emoji: "😐", note: "不咸不淡" },
  { id: "lazy", label: "懒得动", emoji: "🛌", note: "能躺着不坐着" },
  { id: "annoyed", label: "有点烦", emoji: "🌧️", note: "别来惹我" },
];

export const TIMES: { id: TimeLimit; label: string; note: string }[] = [
  { id: 15, label: "15 分钟", note: "一小会" },
  { id: 30, label: "30 分钟", note: "一段" },
  { id: 60, label: "1 小时", note: "慢慢来" },
];

export const BUDGETS: { id: BudgetLimit; label: string; note: string }[] = [
  { id: 0, label: "0 元", note: "一分不花" },
  { id: 20, label: "20 元内", note: "意思一下" },
  { id: 50, label: "50 元内", note: "放宽一点" },
  { id: 999, label: "不限", note: "看心情" },
];

export const CITIES = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "成都",
  "重庆",
  "武汉",
  "西安",
  "南京",
  "苏州",
  "天津",
  "长沙",
  "郑州",
  "青岛",
  "厦门",
  "福州",
  "合肥",
  "昆明",
  "大连",
  "沈阳",
  "哈尔滨",
  "济南",
  "宁波",
  "无锡",
  "佛山",
  "东莞",
  "珠海",
  "三亚",
  "拉萨",
  "乌鲁木齐",
  "兰州",
  "贵阳",
  "南宁",
  "海口",
  "石家庄",
  "太原",
  "南昌",
  "长春",
  "呼和浩特",
  "银川",
  "西宁",
  "香港",
  "澳门",
  "台北",
];

export const RARITY_EXP: Record<Rarity, number> = {
  普通: 10,
  稀有: 20,
  离谱: 35,
};
