export async function onRequestGet(context) {
  const { DB } = context.env;
  const { results } = await DB.prepare(
    `SELECT id, source, source_url, original_title, title_cn, summary_cn, content_angle, platform, score, status, created_at
     FROM ideas
     ORDER BY created_at DESC
     LIMIT 50`
  ).all();

  return new Response(JSON.stringify({ items: results || [] }), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
