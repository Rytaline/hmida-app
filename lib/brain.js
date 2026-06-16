import { Client } from "@notionhq/client";

// CERVEAU TELL'R — mémoire persistante injectée à chaque échange.
// Équipe = stable (codée). Projets actifs + dernières décisions = lus dans Notion.

function client() {
  const auth = process.env.NOTION_TOKEN;
  return auth ? new Client({ auth }) : null;
}

const DB = {
  projets: process.env.NOTION_DB_PROJETS || "361426eb-4826-47bd-a4cd-8ff5665bb2f7",
  decisions: process.env.NOTION_DB_DECISIONS || "0306b64b-6625-4a49-a39c-ee92dc2e8024",
};

const EQUIPE = `ÉQUIPE TELL'R (mémorise qui fait quoi) :
- Rita — pilote / GO décisionnaire
- Souleimane — éditorial
- Mehdi & Michbel — sense making / recherche
- Zahra — direction artistique
- Mahacine — production
- Nizar — lancement
- Rim — prospection`;

const DOCTRINE = `REPÈRES TELL'R : studio éditorial souverain (Story School · UM6P / OCP). Lancement public janvier 2027, 1re vidéo 26 juin 2026.
Verticales : V1 = Science & Industrie · V2 = Vision d'Afrique.
Doctrine : compréhension > information · système > événement · cause > symptôme · tension > opinion. Un projet, plusieurs vies.`;

function val(p) {
  if (!p) return "";
  switch (p.type) {
    case "title": return p.title.map((t) => t.plain_text).join("");
    case "rich_text": return p.rich_text.map((t) => t.plain_text).join("");
    case "select": return p.select ? p.select.name : "";
    case "status": return p.status ? p.status.name : "";
    case "date": return p.date ? p.date.start : "";
    default: return "";
  }
}

async function q(c, database_id, filter, sorts, size = 6) {
  try {
    const r = await c.databases.query({ database_id, ...(filter ? { filter } : {}), ...(sorts ? { sorts } : {}), page_size: size });
    return r.results || [];
  } catch (e) { return []; }
}

function pick(props, names) {
  for (const n of names) { const v = val(props[n]); if (v) return v; }
  return "";
}

// Contexte mémoire compact (équipe + projets actifs + dernières décisions).
export async function buildBrain() {
  const c = client();
  const blocks = [EQUIPE, DOCTRINE];
  if (c) {
    const [projets, decisions] = await Promise.all([
      q(c, DB.projets, { property: "Statut", select: { does_not_equal: "Terminé" } }, null, 8).catch(() => []),
      q(c, DB.decisions, null, null, 6).catch(() => []),
    ]);
    if (projets.length) {
      const lines = projets.map((r) => "- " + [pick(r.properties, ["Sujet", "Nom", "Projet", "Titre"]), val(r.properties["Statut"]), pick(r.properties, ["Responsable", "R"])].filter(Boolean).join(" · "));
      blocks.push("PROJETS ACTIFS :\n" + lines.join("\n"));
    }
    if (decisions.length) {
      const lines = decisions.map((r) => "- " + [pick(r.properties, ["Décision", "Nom", "Titre"]), val(r.properties["Statut"])].filter(Boolean).join(" · "));
      blocks.push("DÉCISIONS RÉCENTES :\n" + lines.join("\n"));
    }
  }
  return "MÉMOIRE TELL'R (contexte permanent — utilise-le sans le réciter) :\n" + blocks.join("\n\n");
}
