const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get("id");

  if (id) {
    const data = await env.CARDS_KV.get(id, { type: "json" });
    if (!data) return json({ error: "Not found" }, 404);
    return json(data);
  }

  // List all cards
  const list = await env.CARDS_KV.list();
  const cards = await Promise.all(
    list.keys.map(async ({ name }) => {
      try { return await env.CARDS_KV.get(name, { type: "json" }); }
      catch { return null; }
    })
  );
  return json(cards.filter(Boolean));
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  if (!body.id || !body.name) return json({ error: "id and name required" }, 400);

  body.updatedAt = new Date().toISOString();
  await env.CARDS_KV.put(body.id, JSON.stringify(body));
  return json({ ok: true, id: body.id });
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id  = url.searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);

  await env.CARDS_KV.delete(id);
  return json({ ok: true });
}
