import { Client } from "@notionhq/client";

// Écriture STRUCTURÉE : Hmida crée une ligne dans une base TELL'R depuis une réponse.

function client() {
  const auth = process.env.NOTION_TOKEN;
  return auth ? new Client({ auth }) : null;
}

const DB = {
  taches: process.env.NOTION_DB_TACHES || "48bf84dd-0ee4-4e44-b98e-dcde0dab11a9",
  video: process.env.NOTION_DB_VIDEO || "0e4b8f39-6242-4bd7-a3e2-aa662da32fdc",
  decisions: process.env.NOTION_DB_DECISIONS || "0306b64b-6625-4a49-a39c-ee92dc2e8024",
  projets: process.env.NOTION_DB_PROJETS || "361426eb-4826-47bd-a4cd-8ff5665bb2f7",
};

// Découpe un texte en blocs paragraphe (≤ 1900 caractères, ≤ 25 blocs).
function paragraphs(text) {
  const chunks = [];
  const raw = String(text || "").split(/\n{2,}/);
  for (const part of raw) {
    let s = part.trim();
    if (!s) continue;
    while (s.length > 1900) {
      chunks.push(s.slice(0, 1900));
      s = s.slice(1900);
    }
    chunks.push(s);
  }
  return chunks.slice(0, 25).map((c) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: c } }] },
  }));
}

function titleProp(name, value) {
  return { [name]: { title: [{ type: "text", text: { content: (value || "Sans titre").slice(0, 100) } }] } };
}

// target ∈ { "brief", "script", "video", "tache", "decision" }
export async function createInNotion(target, title, text) {
  const c = client();
  if (!c) return { ok: false, error: "Notion non configuré (NOTION_TOKEN)." };

  let database_id, properties;
  const children = paragraphs(text);

  if (target === "brief") {
    database_id = DB.projets;
    properties = { ...titleProp("Sujet", title) };
  } else if (target === "script") {
    database_id = DB.video;
    properties = { ...titleProp("Titre vidéo", title), Statut: { select: { name: "IDEA" } } };
  } else if (target === "video") {
    database_id = DB.video;
    properties = { ...titleProp("Titre vidéo", title), Statut: { select: { name: "IDEA" } } };
  } else if (target === "tache") {
    database_id = DB.taches;
    properties = { ...titleProp("Tâche", title), Statut: { select: { name: "À faire" } } };
  } else if (target === "decision") {
    database_id = DB.decisions;
    const ctx = String(text || "").slice(0, 1900);
    properties = {
      ...titleProp("Décision", title),
      Statut: { select: { name: "À discuter" } },
      Contexte: { rich_text: [{ type: "text", text: { content: ctx } }] },
    };
  } else {
    return { ok: false, error: "Cible inconnue." };
  }

  try {
    const page = await c.pages.create({ parent: { database_id }, properties, children });
    return { ok: true, url: page.url };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : "Erreur d'écriture Notion." };
  }
}
