// English Pocket -> Notion. Deploy this file as a Cloudflare Worker.
// Configure secret variables in Cloudflare (never in GitHub):
// NOTION_TOKEN, SYNC_KEY, NOTION_DATA_SOURCE_ID
const ALLOWED_ORIGIN = "https://vodkaandgimlet-sudo.github.io";
const NOTION_VERSION = "2025-09-03";
const modeLabels = {
  words: "英単語",
  phrases: "熟語・フレーズ",
  prepositions: "前置詞",
  grammar: "文法ドリル",
  review: "復習"
};

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}
function response(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" }
  });
}
function constantTimeEqual(a, b) {
  if (!a || !b) return false;
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let mismatch = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    mismatch |= (aa[i] || 0) ^ (bb[i] || 0);
  }
  return mismatch === 0;
}
function richText(text) {
  return [{ type: "text", text: { content: String(text).slice(0, 1800) } }];
}
function validate(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (typeof payload.id !== "string" || !/^[a-zA-Z0-9_-]{10,100}$/.test(payload.id)) return false;
  if (typeof payload.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return false;
  if (!Object.prototype.hasOwnProperty.call(modeLabels, payload.mode)) return false;
  if (!Array.isArray(payload.answers) || payload.answers.length < 1 || payload.answers.length > 5) return false;
  return payload.answers.every(a => a && typeof a.question === "string" && a.question.length < 300
    && typeof a.answer === "string" && a.answer.length < 300
    && typeof a.correctAnswer === "string" && a.correctAnswer.length < 300
    && typeof a.correct === "boolean");
}
async function notion(env, path, data) {
  const res = await fetch("https://api.notion.com/v1" + path, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.NOTION_TOKEN,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    console.error("Notion API failure", res.status, body);
    throw new Error("notion_" + res.status);
  }
  return res.json();
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: origin === ALLOWED_ORIGIN ? 204 : 403, headers: cors(origin) });
    }
    if (origin && origin !== ALLOWED_ORIGIN) return response({ ok: false, error: "origin" }, 403, origin);
    if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID || !env.SYNC_KEY) {
      return response({ ok: false, error: "not_configured" }, 503, origin);
    }
    if (!constantTimeEqual(request.headers.get("X-Sync-Key"), env.SYNC_KEY)) {
      return response({ ok: false, error: "unauthorized" }, 401, origin);
    }
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/health") {
      return response({ ok: true, connected: true }, 200, origin);
    }
    if (request.method !== "POST" || path !== "/sync") {
      return response({ ok: false, error: "not_found" }, 404, origin);
    }
    const size = Number(request.headers.get("Content-Length") || 0);
    if (size > 12000) return response({ ok: false, error: "too_large" }, 413, origin);
    let payload;
    try { payload = JSON.parse(await request.text()); }
    catch { return response({ ok: false, error: "json" }, 400, origin); }
    if (!validate(payload)) return response({ ok: false, error: "invalid" }, 400, origin);

    const ds = encodeURIComponent(env.NOTION_DATA_SOURCE_ID);
    try {
      // Retry-safe: identify sessions using their random ID.
      const prior = await notion(env, "/data_sources/" + ds + "/query", {
        filter: { property: "セッションID", rich_text: { equals: payload.id } },
        page_size: 1
      });
      if (prior.results?.length) {
        return response({ ok: true, duplicate: true }, 200, origin);
      }

      const score = payload.answers.filter(a => a.correct).length;
      const misses = payload.answers.filter(a => !a.correct);
      const shortDate = payload.date;
      const summary = misses.map(a => a.question + " → " + a.correctAnswer).join(" / ");
      const children = payload.answers.map((a, i) => ({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: richText(
            (i + 1) + ". " + (a.correct ? "○" : "×") + " " + a.question +
            " / 回答: " + a.answer + " / 正解: " + a.correctAnswer
          )
        }
      }));
      await notion(env, "/pages", {
        parent: { type: "data_source_id", data_source_id: env.NOTION_DATA_SOURCE_ID },
        properties: {
          "学習セッション": { title: richText(shortDate + "｜" + modeLabels[payload.mode]) },
          "セッションID": { rich_text: richText(payload.id) },
          "学習日": { date: { start: payload.date } },
          "分野": { select: { name: modeLabels[payload.mode] } },
          "回答数": { number: payload.answers.length },
          "正解数": { number: score },
          "正答率": { number: Math.round(100 * score / payload.answers.length) },
          "間違えた問題": { rich_text: richText(summary || "なし") },
          "記録元": { select: { name: "英語ポケット" } }
        },
        children
      });
      return response({ ok: true, saved: true }, 200, origin);
    } catch (e) {
      console.error("Sync failed", String(e));
      return response({ ok: false, error: "notion_error" }, 502, origin);
    }
  }
};