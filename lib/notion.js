import { Client } from "@notionhq/client";

// Client Notion (jeton côté serveur, jamais exposé au navigateur).
function client() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) return null;
  return new Client({ auth });
}

function titleOf(page) {
  try {
    const props = page.properties || {};
    for (const k of Object.keys(props)) {
      const p = props[k];
      if (p && p.type === "title" && Array.isArray(p.title)) {
        const t = p.title.map((x) => x.plain_text).join("").trim();
        if (t) return t;
      }
    }
  } catch (_) {}
  return "Document";
}

// Recherche interne dans le Notion partagé avec l'intégration.
export async function notionSearch(query, limit = 6) {
  const c = client();
  if (!c) return [];
  try {
    const r = await c.search({
      query,
      filter: { property: "object", value: "page" },
      page_size: limit,
    });
    return (r.results || []).map((p) => ({
      id: p.id,
      url: p.url,
      title: titleOf(p),
    }));
  } catch (e) {
    return [];
  }
}

// Récupère le texte d'une page (blocs de premier niveau).
export async function notionPageText(id, max = 1600) {
  const c = client();
  if (!c) return "";
  try {
    const r = await c.blocks.children.list({ block_id: id, page_size: 50 });
    const parts = [];
    for (const b of r.results || []) {
      const t = b[b.type];
      if (t && Array.isArray(t.rich_text)) {
        const line = t.rich_text.map((x) => x.plain_text).join("");
        if (line.trim()) parts.push(line);
      }
    }
    return parts.join("\n").slice(0, max);
  } catch (e) {
    return "";
  }
}
