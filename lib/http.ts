import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(kind: string, ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 2000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export async function readSmallJson(req: Request, maxBytes = 2048): Promise<unknown | null> {
  try {
    const text = await req.text();
    if (!text || text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function cleanNote(note: unknown, limit = 40): string {
  if (typeof note !== "string") return "";
  return note
    .replace(/[<>{}\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
