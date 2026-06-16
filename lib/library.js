import { Client } from "@notionhq/client";

// Bibliothèque Cadmium / OCP / Sécurité alimentaire — la "mémoire documentaire" de Hmida.
// 80 sources classées par genre, année, axe, tags. ID surchargeable par variable d'env.
export const LIB_DB = process.env.NOTION_DB_BIBLIO || "33c16e21-5c38-40df-abf5-22f301a6b82e";

function client() {
  const auth = process.env.NOTION_TOKEN;
  return auth ? new Client({ auth }) : null;
}

function val(p) {
  if (!p) return "";
  switch (p.type) {
    case "title": return p.title.map((t) => t.plain_text).join("");
    case "rich_text": return p.rich_text.map((t) => t.plain_text).join("");
    case "select": return p.select ? p.select.name : "";
    case "multi_select": return p.multi_select.map((o) => o.name).join(", ");
    case "date": return p.date ? p.date.start : "";
    case "url": return p.url || "";
    default: return "";
  }
}

// Récupère TOUTE la bibliothèque (pagination), normalisée.
export async function fetchLibrary() {
  const c = client();
  if (!c) return [];
  const rows = [];
  let cursor;
  try {
    do {
      const r = await c.databases.query({
        database_id: LIB_DB,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      for (const p of r.results || []) {
        const pr = p.properties || {};
        rows.push({
          id: p.id,
          titre: val(pr["Titre"]),
          genre: val(pr["Genre"]),
          axe: val(pr["Axe"]),
          annee: val(pr["Année"]),
          source: val(pr["Source / Média"]),
          pays: val(pr["Pays / zone"]),
          fiab: val(pr["Fiabilité"]),
          angle: val(pr["Angle utile TELL'R"]),
          tags: val(pr["Tags"]),
          url: val(pr["URL"]),
        });
      }
      cursor = r.has_more ? r.next_cursor : null;
    } while (cursor);
  } catch (e) {
    return rows;
  }
  return rows;
}

// Faut-il convoquer la bibliothèque pour cette question ?
export function wantsLibrary(question) {
  const ql = (question || "").toLowerCase();
  return /(article|source|lire|biblioth|cadmium|ocp|phosphate|engrais|s[ée]curit[ée] alimentaire|afrique|anses|reportage|documentaire|vid[ée]o|podcast|enqu[êe]te|veille|r[ée]f[ée]rence|dossier)/.test(ql);
}

// Digest textuel des sources les plus pertinentes — injecté dans le contexte de Hmida.
export async function libraryDigest(question, limit = 14) {
  const rows = await fetchLibrary();
  if (!rows.length) return "";
  const ql = (question || "").toLowerCase();
  const terms = ql.split(/[^a-zà-ÿ0-9]+/).filter((w) => w.length > 3);
  const scored = rows.map((r) => {
    const hay = (r.titre + " " + r.source + " " + r.angle + " " + r.axe + " " + r.tags).toLowerCase();
    let s = 0;
    for (const t of terms) if (hay.includes(t)) s += 1;
    // léger bonus aux sources prioritaires et récentes
    if (/prioritaire/i.test(r.fiab)) s += 0.5;
    if (r.annee === "2026") s += 0.3;
    return { r, s };
  });
  scored.sort((a, b) => b.s - a.s);
  const top = scored.filter((x) => x.s > 0).slice(0, limit);
  const chosen = (top.length ? top : scored.slice(0, limit)).map((x) => x.r);
  const lines = chosen.map(
    (r) => `- « ${r.titre} » — ${r.source} (${r.annee}, ${r.genre} · ${r.fiab}). ${r.angle} ${r.url}`
  );
  return "BIBLIOTHÈQUE TELL'R (sources réelles, cite-les avec leur lien) :\n" + lines.join("\n");
}
