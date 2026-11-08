type AIResult = { data: unknown; reason?: string };

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY?.trim());
}

function extractJson(content: string): unknown {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function requestOnce(
  url: string,
  key: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function callAIJSON(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<AIResult> {
  const key = process.env.AI_API_KEY?.trim();
  if (!key) return { data: null, reason: "no_key" };

  const base = (process.env.AI_BASE_URL?.trim() || "https://api.deepseek.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim() || "deepseek-chat";
  const url = `${base}/chat/completions`;
  const timeoutMs = opts.timeoutMs ?? 12000;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 800,
    stream: false,
  };

  let res = await requestOnce(url, key, { ...body, response_format: { type: "json_object" } }, timeoutMs);
  if (res && res.status === 400) {
    res = await requestOnce(url, key, body, timeoutMs);
  }
  if (!res) return { data: null, reason: "timeout" };
  if (!res.ok) return { data: null, reason: `http_${res.status}` };

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return { data: null, reason: "bad_response" };
  }

  const content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content;
  if (typeof content !== "string" || !content.trim()) return { data: null, reason: "empty" };

  const data = extractJson(content);
  if (data === null) return { data: null, reason: "bad_json" };
  return { data };
}
