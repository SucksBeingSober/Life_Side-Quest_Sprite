import { clientIp, jsonResponse, rateLimit } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WeatherResult {
  ok: true;
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
  updatedAt: number;
}

const CITY_COORDS: Record<string, [number, number]> = {
  北京: [39.9042, 116.4074],
  上海: [31.2304, 121.4737],
  广州: [23.1291, 113.2644],
  深圳: [22.5431, 114.0579],
  杭州: [30.2741, 120.1551],
  成都: [30.5728, 104.0668],
  重庆: [29.563, 106.5516],
  武汉: [30.5928, 114.3055],
  西安: [34.3416, 108.9398],
  南京: [32.0603, 118.7969],
  苏州: [31.2989, 120.5853],
  天津: [39.3434, 117.3616],
  长沙: [28.2282, 112.9388],
  郑州: [34.7466, 113.6254],
  青岛: [36.0671, 120.3826],
  厦门: [24.4798, 118.0894],
  福州: [26.0745, 119.2965],
  合肥: [31.8206, 117.2272],
  昆明: [24.8801, 102.8329],
  大连: [38.914, 121.6147],
  沈阳: [41.8057, 123.4315],
  哈尔滨: [45.8038, 126.535],
  济南: [36.6512, 117.1201],
  宁波: [29.8683, 121.544],
  无锡: [31.4912, 120.3119],
  佛山: [23.0218, 113.1219],
  东莞: [23.0207, 113.7518],
  珠海: [22.271, 113.5767],
  三亚: [18.2528, 109.5119],
  拉萨: [29.652, 91.1721],
  乌鲁木齐: [43.8256, 87.6168],
  兰州: [36.0611, 103.8343],
  贵阳: [26.647, 106.6302],
  南宁: [22.817, 108.3665],
  海口: [20.044, 110.1999],
  石家庄: [38.0428, 114.5149],
  太原: [37.8706, 112.5489],
  南昌: [28.682, 115.8579],
  长春: [43.8171, 125.3235],
  呼和浩特: [40.8426, 111.7492],
  银川: [38.4872, 106.2309],
  西宁: [36.6171, 101.7782],
  香港: [22.3193, 114.1694],
  澳门: [22.1987, 113.5439],
  台北: [25.033, 121.5654],
};

const WEATHER_TEXT: Record<number, string> = {
  0: "晴",
  1: "晴间多云",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "浓毛毛雨",
  56: "冻毛毛雨",
  57: "冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "强阵雨",
  82: "暴雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷雨",
  96: "雷雨伴冰雹",
  99: "强雷雨伴冰雹",
};

const cache = new Map<string, { at: number; data: WeatherResult }>();
const geoCache = new Map<string, { lat: number; lon: number; name: string } | null>();
const CACHE_MS = 20 * 60 * 1000;

function weatherText(code: number): string {
  return WEATHER_TEXT[code] ?? "天气未知";
}

function isWetCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 86) ||
    code >= 95
  );
}

async function geocode(city: string) {
  if (geoCache.has(city)) return geoCache.get(city);
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "zh");
    url.searchParams.set("format", "json");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok) {
      geoCache.set(city, null);
      return null;
    }
    const data = (await response.json()) as {
      results?: { latitude: number; longitude: number; name: string }[];
    };
    const hit = data.results?.[0];
    const result = hit ? { lat: hit.latitude, lon: hit.longitude, name: hit.name } : null;
    geoCache.set(city, result);
    return result;
  } catch {
    geoCache.set(city, null);
    return null;
  }
}

export async function GET(req: Request) {
  if (!rateLimit("weather", clientIp(req), 80, 3_600_000)) {
    return jsonResponse({ ok: false, error: "rate_limited" }, 429);
  }

  const requestUrl = new URL(req.url);
  const city = (requestUrl.searchParams.get("city") ?? "")
    .trim()
    .replace(/市$/, "")
    .slice(0, 20);

  if (!city) {
    return jsonResponse({ ok: false, error: "city_required" }, 400);
  }

  const cached = cache.get(city);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return jsonResponse(cached.data);
  }

  let lat: number;
  let lon: number;
  let name = city;

  const coords = CITY_COORDS[city];
  if (coords) {
    [lat, lon] = coords;
  } else {
    const geo = await geocode(city);
    if (!geo) {
      return jsonResponse({ ok: false, error: "city_not_found", city });
    }
    lat = geo.lat;
    lon = geo.lon;
    name = geo.name;
  }

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
      "current",
      "temperature_2m,weather_code,wind_speed_10m",
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!response.ok) {
      return jsonResponse({ ok: false, error: "weather_unavailable", city: name });
    }

    const data = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
    };

    const current = data.current ?? {};
    const daily = data.daily ?? {};
    const code = Number(daily.weather_code?.[0] ?? current.weather_code ?? 0);
    const temperature = Number(
      current.temperature_2m ?? daily.temperature_2m_max?.[0] ?? 0,
    );
    const tempMax = Number(daily.temperature_2m_max?.[0] ?? temperature);
    const tempMin = Number(daily.temperature_2m_min?.[0] ?? temperature);
    const precipitation = Number(daily.precipitation_probability_max?.[0] ?? 0);
    const wind = Number(current.wind_speed_10m ?? 0);

    const result: WeatherResult = {
      ok: true,
      city: name,
      weather: weatherText(code),
      code,
      temperature: Math.round(temperature),
      tempMax: Math.round(tempMax),
      tempMin: Math.round(tempMin),
      precipitation: Math.round(precipitation),
      wind: Math.round(wind),
      isWet: isWetCode(code) || precipitation >= 60,
      isHot: tempMax >= 33,
      isCold: tempMin <= 5,
      updatedAt: Date.now(),
    };

    cache.set(city, { at: Date.now(), data: result });
    return jsonResponse(result);
  } catch {
    return jsonResponse({ ok: false, error: "weather_unavailable", city: name });
  }
}
