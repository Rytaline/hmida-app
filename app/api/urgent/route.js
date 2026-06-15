import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const runtime = "nodejs";

const DB = {
  taches: process.env.NOTION_DB_TACHES || "48bf84dd-0ee4-4e44-b98e-dcde0dab11a9",
  raci: process.env.NOTION_DB_RACI || "28ede34a-3bfd-4851-acb3-7daf78f213eb",
  calendrier: process.env.NOTION_DB_CALENDRIER || "c1320e08-ab51-4b30-9ab6-cd1f612c859b",
};
const today = () => new Date().toISOString().slice(0, 10);
const plus = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

function val(p) {
  if (!p) return "";
  switch (p.type) {
    case "title": return p.title.map((t) => t.plain_text).join("");
    case "select": return p.select ? p.select.name : "";
    case "status": return p.status ? p.status.name : "";
    case "multi_select": return p.multi_select.map((o) => o.name).join(", ");
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

export async function GET() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) return NextResponse.json({ items: [], configured: false });
  const c = new Client({ auth });
  const t = today();
  try {
    const [late, todayTasks, raci, cal] = await Promise.all([
      q(c, DB.taches, { and: [{ property: "Statut", select: { does_not_equal: "Terminé" } }, { property: "Deadline", date: { before: t } }] }, [{ property: "Deadline", direction: "ascending" }]),
      q(c, DB.taches, { and: [{ property: "Statut", select: { does_not_equal: "Terminé" } }, { property: "Deadline", date: { equals: t } }] }, null, 6),
      q(c, DB.raci, { and: [{ property: "Status", select: { does_not_equal: "Terminé" } }, { property: "Date", date: { on_or_before: t } }] }, [{ property: "Date", direction: "ascending" }], 6),
      q(c, DB.calendrier, { and: [{ property: "Date de publication", date: { on_or_after: t } }, { property: "Date de publication", date: { on_or_before: plus(1) } }] }, null, 4),
    ]);
    const items = [];
    for (const r of late) items.push({ kind: "retard", t: val(r.properties["Tâche"]), who: val(r.properties["Responsable"]), when: val(r.properties["Deadline"]) });
    for (const r of todayTasks) items.push({ kind: "aujourdhui", t: val(r.properties["Tâche"]), who: val(r.properties["Responsable"]), when: "aujourd'hui" });
    for (const r of raci) items.push({ kind: "raci", t: val(r.properties["Tâche"]), who: val(r.properties["R"]), when: val(r.properties["Date"]) });
    for (const r of cal) items.push({ kind: "publication", t: val(r.properties["Titre"]), who: val(r.properties["Étape"]), when: val(r.properties["Date de publication"]) });
    return NextResponse.json({ items: items.slice(0, 8), configured: true });
  } catch (e) {
    return NextResponse.json({ items: [], configured: true, error: true });
  }
}
