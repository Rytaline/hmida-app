import { Client } from "@notionhq/client";

// Accès STRUCTURÉ aux bases TELL'R : Hmida lit directement les tables (pas juste la recherche).
// Les IDs par défaut sont ceux du workspace TELL'R ; surchargeables par variables d'env.

function client() {
  const auth = process.env.NOTION_TOKEN;
  return auth ? new Client({ auth }) : null;
}

const DB = {
  taches: process.env.NOTION_DB_TACHES || "48bf84dd-0ee4-4e44-b98e-dcde0dab11a9",
  raci: process.env.NOTION_DB_RACI || "28ede34a-3bfd-4851-acb3-7daf78f213eb",
  calendrier: process.env.NOTION_DB_CALENDRIER || "c1320e08-ab51-4b30-9ab6-cd1f612c859b",
  projets: process.env.NOTION_DB_PROJETS || "361426eb-4826-47bd-a4cd-8ff5665bb2f7",
  video: process.env.NOTION_DB_VIDEO || "0e4b8f39-6242-4bd7-a3e2-aa662da32fdc",
};

const today = () => new Date().toISOString().slice(0, 10);
const plus = (d) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
};

function val(p) {
  if (!p) return "";
  switch (p.type) {
    case "title": return p.title.map((t) => t.plain_text).join("");
    case "rich_text": return p.rich_text.map((t) => t.plain_text).join("");
    case "select": return p.select ? p.select.name : "";
    case "status": return p.status ? p.status.name : "";
    case "multi_select": return p.multi_select.map((o) => o.name).join(", ");
    case "date": return p.date ? p.date.start : "";
    case "checkbox": return p.checkbox ? "oui" : "";
    default: return "";
  }
}

async function q(c, database_id, filter, sorts, page_size = 8) {
  try {
    const r = await c.databases.query({
      database_id,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      page_size,
    });
    return r.results || [];
  } catch (e) {
    return [];
  }
}

function line(props, fields) {
  return fields.map((f) => val(props[f])).filter(Boolean).join(" · ");
}

// Construit un "tableau de bord" textuel selon ce que la question demande.
export async function buildDashboard(question) {
  const c = client();
  if (!c) return "";
  const ql = (question || "").toLowerCase();

  const wantTasks = /(t[âa]che|retard|cette semaine|deadline|[ée]ch[ée]ance|qui (fait|doit|valide)|responsable|[àa] faire|urgent|raci|valide)/.test(ql);
  const wantPub = /(publi|vendredi|calendrier|sortir|programm|reel|short|carrousel|poster|sortie)/.test(ql);
  const wantVideo = /(vid[ée]o|pipeline|montage|tournage|kling|script|shotlist|rush)/.test(ql);
  const wantProj = /(projet|chantier|collection|lancement)/.test(ql);
  const anyOp = wantTasks || wantPub || wantVideo || wantProj;

  const t = today();
  const sections = [];

  if (wantTasks || !anyOp) {
    const late = await q(c, DB.taches,
      { and: [{ property: "Statut", select: { does_not_equal: "Terminé" } }, { property: "Deadline", date: { before: t } }] },
      [{ property: "Deadline", direction: "ascending" }]);
    const week = await q(c, DB.taches,
      { and: [{ property: "Statut", select: { does_not_equal: "Terminé" } }, { property: "Deadline", date: { on_or_after: t } }, { property: "Deadline", date: { on_or_before: plus(7) } }] },
      [{ property: "Deadline", direction: "ascending" }]);
    const raci = await q(c, DB.raci,
      { property: "Status", select: { does_not_equal: "Terminé" } },
      [{ property: "Date", direction: "ascending" }], 10);
    if (late.length) sections.push("TÂCHES EN RETARD :\n" + late.map((r) => "- " + line(r.properties, ["Tâche", "Priorité", "Responsable", "Deadline"])).join("\n"));
    if (week.length) sections.push("TÂCHES À 7 JOURS :\n" + week.map((r) => "- " + line(r.properties, ["Tâche", "Priorité", "Responsable", "Deadline"])).join("\n"));
    if (raci.length) sections.push("RACI (ouvert, par échéance) :\n" + raci.map((r) => "- " + line(r.properties, ["Tâche", "Date", "R", "A", "Verticale"])).join("\n"));
  }

  if (wantPub) {
    const cal = await q(c, DB.calendrier,
      { and: [{ property: "Date de publication", date: { on_or_after: t } }, { property: "Date de publication", date: { on_or_before: plus(7) } }] },
      [{ property: "Date de publication", direction: "ascending" }]);
    if (cal.length) sections.push("PUBLICATIONS (≤ 7 jours) :\n" + cal.map((r) => "- " + line(r.properties, ["Titre", "Date de publication", "Étape", "Plateforme"])).join("\n"));
  }

  if (wantVideo) {
    const vid = await q(c, DB.video,
      { and: [{ property: "Statut", select: { does_not_equal: "PUBLIÉ" } }, { property: "Statut", select: { does_not_equal: "ARCHIVÉ" } }] },
      [{ property: "Deadline", direction: "ascending" }], 12);
    if (vid.length) sections.push("VIDEO PIPELINE (en cours) :\n" + vid.map((r) => "- " + line(r.properties, ["Titre vidéo", "Statut", "Responsable", "Deadline", "Plateforme"])).join("\n"));
  }

  if (wantProj) {
    const pr = await q(c, DB.projets,
      { property: "Statut", select: { does_not_equal: "Terminé" } },
      [{ property: "Deadline", direction: "ascending" }], 10);
    if (pr.length) sections.push("PROJETS (actifs) :\n" + pr.map((r) => "- " + line(r.properties, ["Sujet", "Statut", "Responsable", "Deadline"])).join("\n"));
  }

  if (!sections.length) return "";
  return "TABLEAU DE BORD (live, " + t + ") :\n" + sections.join("\n\n");
}
