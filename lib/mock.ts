import type {
  BudgetLimit,
  Mission,
  MissionRequest,
  Mood,
  Rarity,
  Scene,
  Settlement,
  SpriteMood,
  TalkResult,
} from "./types";
import { newId } from "./game";

type WeatherKey = "rain" | "snow" | "sun" | "hot" | "cold";

interface PoolItem {
  title: string;
  rarity: Rarity;
  tags: string[];
  summary: string;
  steps: string[];
  duration_minutes: number;
  estimated_cost: number;
  fallback: string;
  moods: Mood[];
  weather?: WeatherKey[];
}

const POOL: PoolItem[] = [
  {
    title: "数七种颜色",
    rarity: "普通",
    tags: ["观察", "户外"],
    summary: "站到窗边，找出七种不同的颜色，别挑太好找的。",
    steps: ["走到有自然光的地方", "按红橙黄绿蓝靛紫找", "记下最意外的那个颜色"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "只找三种，找到就收工。",
    moods: ["happy", "normal", "annoyed"],
  },
  {
    title: "给绿植浇水",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "家里那盆快渴死了，今天轮到它被想起来。",
    steps: ["摸摸土，干了再浇", "浇到盆底渗水", "顺手擦掉叶子上的灰"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "只擦叶子，也算照顾过。",
    moods: ["lazy", "normal"],
  },
  {
    title: "清空一个抽屉",
    rarity: "普通",
    tags: ["动手", "室内"],
    summary: "只清一个，不用全屋大扫除，别给自己加戏。",
    steps: ["挑最小的那个抽屉", "全部倒出来", "留下真会用的，其余放回去"],
    duration_minutes: 15,
    estimated_cost: 0,
    fallback: "只扔三样东西。",
    moods: ["annoyed", "normal"],
  },
  {
    title: "发呆五分钟",
    rarity: "普通",
    tags: ["治愈", "独处"],
    summary: "什么都不干，计时器一响就结束，理直气壮。",
    steps: ["手机扣在桌上", "看窗外或者闭眼", "响了就起身"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "发两分钟也算。",
    moods: ["lazy", "annoyed"],
  },
  {
    title: "拍三张同色照片",
    rarity: "稀有",
    tags: ["观察", "户外"],
    summary: "定一个颜色，在附近拍三张，凑齐就算赢。",
    steps: ["先定一个颜色", "在楼下或窗边找", "拍满三张"],
    duration_minutes: 15,
    estimated_cost: 0,
    fallback: "只拍一张，拍到就行。",
    moods: ["happy", "normal"],
  },
  {
    title: "写三件小事",
    rarity: "普通",
    tags: ["独处", "治愈"],
    summary: "今天发生的三件小事，越小越好写。",
    steps: ["打开备忘录", "写三行，不许评价", "写完就关掉"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "只写一件。",
    moods: ["lazy", "normal", "annoyed"],
  },
  {
    title: "爬两趟楼梯",
    rarity: "普通",
    tags: ["运动", "室内"],
    summary: "不换衣服，不拉伸，上下两趟就回。",
    steps: ["走到楼梯口", "上下一趟", "再来一趟"],
    duration_minutes: 12,
    estimated_cost: 0,
    fallback: "只爬一层。",
    moods: ["annoyed", "happy"],
  },
  {
    title: "听一首新歌",
    rarity: "普通",
    tags: ["治愈", "独处"],
    summary: "随机点开一首没听过的，听完再切。",
    steps: ["打开音乐软件", "随机一首陌生歌", "完整听完"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "听半首也行。",
    moods: ["lazy", "normal", "happy"],
  },
  {
    title: "擦干净手机屏",
    rarity: "普通",
    tags: ["动手", "室内"],
    summary: "那块屏比你想的脏，擦完心情会好一点。",
    steps: ["找一块软布", "关屏，擦一遍", "顺便清三个通知"],
    duration_minutes: 8,
    estimated_cost: 0,
    fallback: "只擦中间那块。",
    moods: ["normal", "lazy"],
  },
  {
    title: "对镜子笑一下",
    rarity: "离谱",
    tags: ["脑洞", "室内"],
    summary: "关上门，对镜子笑三秒，丑也没人看见。",
    steps: ["找一面镜子", "对着笑三秒", "评价一下自己的笑"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "笑一秒也行。",
    moods: ["happy", "annoyed"],
  },
  {
    title: "找一条新小路",
    rarity: "稀有",
    tags: ["户外", "观察"],
    summary: "从家门口出发，走一条没走过的小路。",
    steps: ["选一个没走过的方向", "走五分钟", "记住回来的路"],
    duration_minutes: 30,
    estimated_cost: 0,
    fallback: "只走到路口就回。",
    moods: ["happy", "normal"],
  },
  {
    title: "读三页书",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "三页，不许多读，读完就合上。",
    steps: ["拿最近那本", "只读三页", "合上，记住一句"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "读一页也算。",
    moods: ["lazy", "normal"],
  },
  {
    title: "给明天留句话",
    rarity: "普通",
    tags: ["独处", "治愈"],
    summary: "写一句给明天的自己，别写鸡汤。",
    steps: ["打开备忘录", "写一句话", "设个明早提醒"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "写在便利贴上。",
    moods: ["lazy", "annoyed", "normal"],
  },
  {
    title: "整理桌面",
    rarity: "普通",
    tags: ["动手", "室内"],
    summary: "只清桌面，抽屉不算，别扩大战场。",
    steps: ["把杂物归堆", "只留三样", "其余收进抽屉"],
    duration_minutes: 15,
    estimated_cost: 0,
    fallback: "只清一个角。",
    moods: ["annoyed", "normal"],
  },
  {
    title: "窗边看云",
    rarity: "普通",
    tags: ["治愈", "户外"],
    summary: "看三分钟云，能认出形状更好。",
    steps: ["走到窗边", "抬头看三分钟", "记下最像什么"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "看一分钟也行。",
    moods: ["lazy", "happy", "normal"],
  },
  {
    title: "买杯没喝过的",
    rarity: "普通",
    tags: ["治愈", "户外"],
    summary: "便利店里挑一个没喝过的，别选最保险的。",
    steps: ["进一家便利店", "挑没喝过的", "第一口慢慢喝"],
    duration_minutes: 20,
    estimated_cost: 15,
    fallback: "买瓶水也算。",
    moods: ["happy", "normal"],
  },
  {
    title: "逛一家新小店",
    rarity: "稀有",
    tags: ["户外", "观察"],
    summary: "路过没进去过的那种店，进去转五分钟。",
    steps: ["挑一家没进过的", "转五分钟", "只买需要的一样"],
    duration_minutes: 30,
    estimated_cost: 20,
    fallback: "在门口看两眼。",
    moods: ["happy", "normal"],
  },
  {
    title: "去公园坐十分钟",
    rarity: "普通",
    tags: ["户外", "治愈"],
    summary: "找张长椅坐下，不刷手机，十分钟。",
    steps: ["走到最近的公园", "找一张长椅", "坐满十分钟"],
    duration_minutes: 30,
    estimated_cost: 0,
    fallback: "坐三分钟也行。",
    moods: ["lazy", "annoyed", "happy"],
  },
  {
    title: "坐公交到终点",
    rarity: "稀有",
    tags: ["户外", "观察"],
    summary: "随便上一趟公交，坐到终点再回来。",
    steps: ["选一趟没坐过的", "坐到终点站", "原路返回"],
    duration_minutes: 60,
    estimated_cost: 4,
    fallback: "只坐三站。",
    moods: ["happy", "normal", "annoyed"],
  },
  {
    title: "菜市场买一种菜",
    rarity: "稀有",
    tags: ["动手", "户外"],
    summary: "买一种你没做过的菜，问摊主怎么做。",
    steps: ["挑一种没做过的", "问一句怎么做", "回家试一次"],
    duration_minutes: 60,
    estimated_cost: 25,
    fallback: "只买，不做。",
    moods: ["happy", "normal"],
  },
  {
    title: "打印一张照片",
    rarity: "普通",
    tags: ["动手", "治愈"],
    summary: "手机里挑一张，打印出来，贴到看得见的地方。",
    steps: ["翻相册挑一张", "找一家打印店", "贴到看得见的地方"],
    duration_minutes: 30,
    estimated_cost: 6,
    fallback: "只挑出来，设成壁纸。",
    moods: ["normal", "lazy"],
  },
  {
    title: "翻一本封面好看的书",
    rarity: "普通",
    tags: ["观察", "室内"],
    summary: "只看封面挑，翻十分钟，空手出来也行。",
    steps: ["进一家书店", "按封面挑一本", "翻十分钟"],
    duration_minutes: 45,
    estimated_cost: 0,
    fallback: "看封面就行。",
    moods: ["lazy", "normal", "happy"],
  },
  {
    title: "吃一家没吃过的小店",
    rarity: "普通",
    tags: ["户外", "社交"],
    summary: "避开常去的那几家，进一家没吃过的。",
    steps: ["走两条街", "挑一家人不多的", "点一份招牌"],
    duration_minutes: 60,
    estimated_cost: 40,
    fallback: "只买个小吃。",
    moods: ["happy", "normal"],
  },
  {
    title: "给路灯起名字",
    rarity: "离谱",
    tags: ["脑洞", "户外"],
    summary: "沿路给三盏路灯起名，越离谱越好。",
    steps: ["出门走一段", "挑三盏路灯", "起名并记下来"],
    duration_minutes: 20,
    estimated_cost: 0,
    fallback: "只给一盏起名。",
    moods: ["happy", "annoyed"],
  },
  {
    title: "和影子合张影",
    rarity: "离谱",
    tags: ["脑洞", "户外"],
    summary: "找块有光的地，和影子拍一张。",
    steps: ["找一块阳光", "站稳，拍影子", "看看拍成什么样"],
    duration_minutes: 15,
    estimated_cost: 0,
    fallback: "只拍影子不拍人。",
    moods: ["happy", "normal"],
  },
  {
    title: "用左手写一句话",
    rarity: "离谱",
    tags: ["脑洞", "室内"],
    summary: "用不常用的那只手写一句，丑就对了。",
    steps: ["拿纸和笔", "用左手写一句", "拍照存档"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "写三个字也算。",
    moods: ["annoyed", "lazy"],
  },
  {
    title: "买一种没吃过的水果",
    rarity: "普通",
    tags: ["户外", "观察"],
    summary: "水果店挑一种没吃过的，只买一个。",
    steps: ["进一家水果店", "挑没吃过的", "只买一个"],
    duration_minutes: 15,
    estimated_cost: 15,
    fallback: "买最常见的也行。",
    moods: ["happy", "normal"],
  },
  {
    title: "窗边听雨",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "把窗开一条缝，听十分钟雨，别刷手机。",
    steps: ["把窗开一条缝", "站着听十分钟", "别碰手机"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "听三分钟也行。",
    moods: ["lazy", "normal", "annoyed"],
    weather: ["rain"],
  },
  {
    title: "晒十分钟太阳",
    rarity: "普通",
    tags: ["治愈", "户外"],
    summary: "找一块有阳光的地方，站十分钟，别隔着玻璃。",
    steps: ["找一块有阳光的地方", "站或坐十分钟", "晒到后背发热"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "晒三分钟。",
    moods: ["lazy", "normal", "happy"],
    weather: ["sun"],
  },
  {
    title: "煮一杯热饮",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "家里有什么就煮什么，热的就行。",
    steps: ["找一样能煮的", "煮到冒热气", "慢慢喝完"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "倒杯热水也行。",
    moods: ["lazy", "annoyed"],
    weather: ["cold", "rain"],
  },
  {
    title: "错峰走一圈",
    rarity: "普通",
    tags: ["运动", "户外"],
    summary: "等太阳弱一点，沿街走一圈就回，别硬晒。",
    steps: ["等太阳偏西", "沿街走一圈", "回来补水"],
    duration_minutes: 20,
    estimated_cost: 0,
    fallback: "走到路口就回。",
    moods: ["normal", "happy"],
    weather: ["hot"],
  },
  {
    title: "窗边看雪",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "雪天不用出门，窗边看十分钟就够。",
    steps: ["走到窗边", "看满十分钟", "拍一张照片"],
    duration_minutes: 10,
    estimated_cost: 0,
    fallback: "看三分钟。",
    moods: ["lazy", "happy"],
    weather: ["snow"],
  },
];

const UNIVERSAL: PoolItem[] = [
  {
    title: "喝杯水站一会",
    rarity: "普通",
    tags: ["治愈", "室内"],
    summary: "站起来，慢慢喝完一杯水，再坐下。",
    steps: ["倒一杯水", "站着喝完", "再坐下"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "喝一口也行。",
    moods: ["lazy", "normal", "annoyed", "happy"],
  },
  {
    title: "看窗外一分钟",
    rarity: "普通",
    tags: ["观察", "户外"],
    summary: "走到窗边，看满一分钟再回来。",
    steps: ["走到窗边", "看满一分钟", "说出你看到的一样东西"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "看三十秒。",
    moods: ["lazy", "normal", "annoyed", "happy"],
  },
  {
    title: "伸个懒腰",
    rarity: "普通",
    tags: ["运动", "室内"],
    summary: "站起来伸个懒腰，顺便转转脖子。",
    steps: ["先站起来", "举手伸懒腰", "转转脖子"],
    duration_minutes: 5,
    estimated_cost: 0,
    fallback: "只伸一只手。",
    moods: ["lazy", "normal", "annoyed", "happy"],
  },
];

const RARITY_BONUS: Record<Rarity, number> = { 普通: 0, 稀有: 1.4, 离谱: 0.6 };

function pickThree(
  candidates: PoolItem[],
  mood: Mood,
  weatherKey: WeatherKey | null,
): PoolItem[] {
  const scored = candidates.map((item) => ({
    item,
    score:
      (item.moods.includes(mood) ? 4 : 0) +
      RARITY_BONUS[item.rarity] +
      (weatherKey && item.weather?.includes(weatherKey) ? 6 : 0) +
      Math.random() * 3,
  }));
  scored.sort((a, b) => b.score - a.score);

  const chosen: PoolItem[] = [];
  const tags = new Set<string>();
  const remaining = [...scored];

  while (chosen.length < 3 && remaining.length > 0) {
    let index = 0;
    if (chosen.length > 0) {
      const fresh = remaining.findIndex(({ item }) => item.tags.some((t) => !tags.has(t)));
      if (fresh >= 0) index = fresh;
    }
    const picked = remaining[index];
    if (picked.item.rarity === "离谱" && chosen.some((item) => item.rarity === "离谱")) {
      remaining.splice(index, 1);
      continue;
    }
    remaining.splice(index, 1);
    chosen.push(picked.item);
    picked.item.tags.forEach((t) => tags.add(t));
  }

  return chosen;
}

export function buildMockMissions(req: MissionRequest): Mission[] {
  const code = req.weather_code;
  const precipitation = req.precipitation ?? 0;
  const temperature = req.temperature;
  const wet =
    (code !== undefined && code >= 51) ||
    precipitation >= 60 ||
    /雨|雪|雷/.test(req.weather ?? "");
  const snow =
    code !== undefined && ((code >= 71 && code <= 77) || code === 85 || code === 86);
  const weatherKey: WeatherKey | null =
    code === undefined && !req.weather
      ? null
      : snow
        ? "snow"
        : wet
          ? "rain"
          : temperature !== undefined && temperature >= 33
            ? "hot"
            : temperature !== undefined && temperature <= 5
              ? "cold"
              : "sun";

  const all = [...POOL, ...UNIVERSAL];
  let eligible = all.filter(
    (item) => item.duration_minutes <= req.time && item.estimated_cost <= req.budget,
  );
  if (req.time < 30) {
    eligible = eligible.filter((item) => item.rarity !== "离谱");
  }
  if (wet) {
    const indoor = eligible.filter(
      (item) => !item.tags.includes("户外") || item.tags.includes("室内"),
    );
    if (indoor.length >= 3) eligible = indoor;
  }
  const exclude = new Set((req.exclude ?? []).map((t) => t.trim()).filter(Boolean));
  let pool = eligible.filter((item) => !exclude.has(item.title));
  if (pool.length < 3) pool = eligible;
  if (pool.length < 3) pool = [...UNIVERSAL];

  return pickThree(pool, req.mood, weatherKey).map((item) => ({
    id: newId(),
    title: item.title,
    rarity: item.rarity,
    tags: [...item.tags],
    summary: item.summary,
    steps: [...item.steps],
    duration_minutes: item.duration_minutes,
    estimated_cost: item.estimated_cost,
    fallback: item.fallback,
  }));
}

/** 灵感为 0 时的保底：固定三条五分钟内的小事，不随机、不可换，防止无限抽卡。 */
export function buildGuaranteedMissions(): Mission[] {
  return UNIVERSAL.map((item) => ({
    id: newId(),
    title: item.title,
    rarity: item.rarity,
    tags: [...item.tags],
    summary: item.summary,
    steps: [...item.steps],
    duration_minutes: item.duration_minutes,
    estimated_cost: item.estimated_cost,
    fallback: item.fallback,
  }));
}

export function spriteMoodFor(mood: Mood): SpriteMood {
  switch (mood) {
    case "happy":
      return "proud";
    case "lazy":
      return "bored";
    case "annoyed":
      return "smug";
    default:
      return "soft";
  }
}

const LINES: Record<Scene, Record<Mood, string[]>> = {  opening: {
    happy: ["来了？今天看着不像来躺平的。", "行，状态在线，那给你找点事做。"],
    normal: ["又无聊了？行，给你派个不社死的支线。", "站着也是站着，挑一条？"],
    lazy: ["不想动就不动，先挑个五分钟的。", "懒就懒，给你个能交差的。"],
    annoyed: ["烦就烦，别硬撑。给你个能自己待着的。", "脸色不太行。支线挑安静的，行吧。"],
  },
  mission: {
    happy: ["这条，适合你现在这股劲。", "挑好了，别临阵脱逃。"],
    normal: ["就它了，难度不高，别想太多。", "这条不社死，放心。"],
    lazy: ["这条最短，做完就躺。", "给你挑了个不用出门的。"],
    annoyed: ["这条没人打扰，去吧。", "不用说话，做完就回。"],
  },
  complete: {
    happy: ["行啊，真去了。比嘴上说说强。", "可以，今天这条没白派。"],
    normal: ["做完了？行，算你有点行动力。", "收下，不夸你，但记上了。"],
    lazy: ["居然真做了。行，我收回一半嫌弃。", "动都动了，不错。"],
    annoyed: ["烦还做完了，有点东西。", "行，这口气出得值。"],
  },
  idle: {
    happy: ["点我干嘛，支线在等你。", "别戳了，去挑一条。"],
    normal: ["有事说事，没事去派支线。", "戳我也不会掉经验。"],
    lazy: ["别戳，累。", "再戳就给你派个要出门的。"],
    annoyed: ["戳够了没。", "手挺闲，那去做条支线。"],
  },
  empty: {
    happy: ["灵感用完了。先把手上的做了，或者领条保底的。", "抽卡抽空了吧。给你条免费的。"],
    normal: ["没灵感了。先做一条，回来就有了。", "灵感见底。要不要领条保底？"],
    lazy: ["没灵感了。正好，做条最短的。", "空了啊。保底那条不用灵感。"],
    annoyed: ["灵感没了。别瞪我，做一条就回血。", "空了。保底支线，爱要不要。"],
  },
};

const WARM_LINES: Record<Scene, string[]> = {
  opening: ["又来了。行，今天想走哪条？", "来了啊。上次那条，我记着呢。"],
  mission: ["这条我挑的，别辜负。", "就它吧，我替你看着。"],
  complete: ["又完成一条。嘴上不说，我记着。", "行啊，你比刚来的时候靠谱多了。"],
  idle: ["别戳了，我在。", "戳吧，反正我也不走。"],
  empty: ["没灵感了？没事，明天再来。", "先歇着，我不催。"],
};

export function pickLine(scene: Scene, mood: Mood, completions = 0): string {
  const warmChance = completions >= 8 ? 0.6 : completions >= 3 ? 0.35 : 0;
  if (warmChance > 0 && Math.random() < warmChance) {
    const warm = WARM_LINES[scene];
    return warm[Math.floor(Math.random() * warm.length)];
  }
  const list = LINES[scene][mood];
  return list[Math.floor(Math.random() * list.length)];
}

export function fallbackTalk(scene: Scene, mood: Mood, completions = 0): TalkResult {
  return { mood: spriteMoodFor(mood), text: pickLine(scene, mood, completions), source: "fallback" };
}

const AWARDS: Record<Rarity, string[]> = {
  普通: ["楼道观察员", "五分钟生活家", "今日行动派", "桌面清空者", "黄昏散步员", "小事完成者", "楼下探险家", "临时整理师"],
  稀有: ["城市边角猎手", "临时出走者", "街角人类学家", "路线开辟者", "周末侦察员"],
  离谱: ["路灯命名师", "影子合影人", "左手写字怪", "无意义大师", "脑洞执行者"],
};

const TAG_AWARDS: Record<string, string[]> = {
  户外: ["楼下探险家", "黄昏散步员", "城市边角猎手", "周末侦察员"],
  观察: ["街角观察员", "细节收集者", "窗边记录员", "城市边角猎手"],
  室内: ["室内生存家", "桌面清空者", "五分钟生活家"],
  动手: ["临时整理师", "桌面清空者", "动手派"],
  治愈: ["五分钟生活家", "小事完成者", "自我照顾员"],
  独处: ["独处练习生", "五分钟生活家", "安静的人"],
  运动: ["今日行动派", "楼梯征服者", "身体唤醒员"],
  脑洞: ["路灯命名师", "无意义大师", "脑洞执行者"],
  社交: ["街角人类学家", "开口练习生", "临时社交员"],
};

const REACTIONS_NEUTRAL = [
  "「{title}」这条，你收了。行，今天不算白过。",
  "完成。不用解释，做了就是做了。",
  "「{title}」——记上了。别急着谦虚。",
  "行，「{title}」这事你办了。我记一笔。",
];

const REACTIONS_REFLECTIVE = [
  "你写的那句，比称号实在。",
  "感受收下了。「{title}」没白做。",
  "行，做完还愿意写两句，说明真有点感觉。",
];

const SHARES = [
  "今天给自己派了条支线：{title}。居然做完了。",
  "「人生支线小精灵」派的支线：{title}。完成。",
  "今日支线：{title}。完成，盖章。",
];

function fill(template: string, title: string): string {
  return template.replaceAll("{title}", title);
}

export function fallbackSettlement(input: {
  missionTitle: string;
  rarity: Rarity;
  reflection?: string;
  tags?: string[];
}): Settlement {
  const tagged = [...new Set((input.tags ?? []).flatMap((tag) => TAG_AWARDS[tag] ?? []))];
  const awards = tagged.length > 0 ? tagged : AWARDS[input.rarity] ?? AWARDS["普通"];
  const title = awards[Math.floor(Math.random() * awards.length)];
  const hasReflection = Boolean(input.reflection?.trim());
  const pool = hasReflection ? REACTIONS_REFLECTIVE : REACTIONS_NEUTRAL;
  const reaction = fill(pool[Math.floor(Math.random() * pool.length)], input.missionTitle);
  const share = fill(SHARES[Math.floor(Math.random() * SHARES.length)], input.missionTitle);
  return {
    title,
    reaction: reaction.slice(0, 60),
    share_text: share.slice(0, 50),
  };
}

export function budgetLabel(budget: BudgetLimit): string {
  if (budget === 0) return "0 元";
  if (budget === 20) return "20 元内";
  if (budget === 50) return "50 元内";
  return "不限";
}
