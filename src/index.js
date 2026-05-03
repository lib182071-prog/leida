const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const HN_LIMIT = 10;

function fallbackFields(item) {
  return {
    title_cn: item.title || "",
    summary_cn: "暂无摘要",
    content_angle: "行业动态",
    platform: "小红书",
    score: 60
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return res.json();
}

function safeParseAiJson(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function enrichWithAI(item, env) {
  const prompt = `你是科技编辑。请基于以下 Hacker News 信息生成 JSON，不要输出任何额外文字：\n${JSON.stringify({
    title: item.title || "",
    url: item.url || "",
    text: item.text || ""
  })}\nJSON 字段必须包含：title_cn, summary_cn, content_angle, platform, score。score 为 0-100 的整数。`;

  try {
    const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "你擅长生成中文科技资讯摘要，返回严格 JSON。" },
        { role: "user", content: prompt }
      ]
    });

    const rawText = aiResult?.response || aiResult?.result?.response || "";
    const parsed = safeParseAiJson(rawText);
    if (!parsed) return fallbackFields(item);

    return {
      title_cn: parsed.title_cn || item.title || "",
      summary_cn: parsed.summary_cn || "暂无摘要",
      content_angle: parsed.content_angle || "行业动态",
      platform: parsed.platform || "小红书",
      score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Number(parsed.score))) : 60
    };
  } catch {
    return fallbackFields(item);
  }
}

async function saveIdea(env, item, ai) {
  const stmt = env.DB.prepare(`
    INSERT INTO ideas (id, source, source_url, original_title, title_cn, summary_cn, content_angle, platform, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source = excluded.source,
      source_url = excluded.source_url,
      original_title = excluded.original_title,
      title_cn = excluded.title_cn,
      summary_cn = excluded.summary_cn,
      content_angle = excluded.content_angle,
      platform = excluded.platform,
      score = excluded.score
  `);

  return stmt
    .bind(
      item.id,
      "hackernews",
      item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      item.title || "",
      ai.title_cn,
      ai.summary_cn,
      ai.content_angle,
      ai.platform,
      Math.round(ai.score)
    )
    .run();
}

async function runPipeline(env) {
  const topIds = await fetchJson(HN_TOP_STORIES_URL);
  const ids = topIds.slice(0, HN_LIMIT);

  for (const id of ids) {
    const item = await fetchJson(`${HN_ITEM_URL}/${id}.json`);
    if (!item || !item.id || !item.title) continue;
    const ai = await enrichWithAI(item, env);
    await saveIdea(env, item, ai);
  }
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runPipeline(env));
  },

  async fetch(_request, _env) {
    return new Response(
      JSON.stringify({ ok: true, service: "ai-content-radar", timestamp: new Date().toISOString() }),
      { headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
};
