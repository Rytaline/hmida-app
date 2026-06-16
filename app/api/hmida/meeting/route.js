import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createInNotion } from "../../../../lib/write";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYS = `Tu es Hmida. On te donne le compte-rendu brut d'un daily TELL'R (notes ou transcription voix). Extrais-en la structure pour TELL'R.
Équipe : Rita (pilote), Souleimane (édito), Mehdi & Michbel (sense making/recherche), Zahra (DA), Mahacine (prod/tournage), Nizar (lancement/com), Rim (prospection), Rayane (montage).
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, de la forme :
{"resume":"1-2 phrases", "decisions":[{"titre":"...", "contexte":"..."}], "taches":[{"titre":"...", "responsable":"Prénom ou ''", "echeance":"AAAA-MM-JJ ou ''"}]}
Règles : titres courts et actionnables ; déduis le responsable du contexte quand c'est clair (sinon "") ; convertis les dates relatives (demain, vendredi) en AAAA-MM-JJ à partir de la date fournie ; n'invente rien qui n'est pas dans le compte-rendu.`;

function extractJson(s) {
  if (!s) return null;
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (_) { return null; }
}

export async function POST(req) {
  let transcript = "";
  try { const b = await req.json(); transcript = b && b.transcript ? String(b.transcript) : ""; } catch (_) {}
  if (!transcript.trim()) return NextResponse.json({ error: "Compte-rendu vide." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Clé API manquante." }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  let data;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0.3,
      system: SYS,
      messages: [{ role: "user", content: "Date du jour : " + today + "\n\nCompte-rendu du daily :\n" + transcript }],
    });
    const text = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("");
    data = extractJson(text);
  } catch (e) {
    return NextResponse.json({ error: "Erreur Claude : " + (e && e.message ? e.message : "inconnue") }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Extraction impossible." }, { status: 500 });

  const created = [];
  const decisions = Array.isArray(data.decisions) ? data.decisions.slice(0, 12) : [];
  const taches = Array.isArray(data.taches) ? data.taches.slice(0, 20) : [];

  for (const d of decisions) {
    if (!d || !d.titre) continue;
    const r = await createInNotion("decision", d.titre, d.contexte || "");
    created.push({ type: "Décision", titre: d.titre, ok: !!r.ok, url: r.url || "" });
  }
  for (const t of taches) {
    if (!t || !t.titre) continue;
    const meta = [t.responsable ? "Responsable : " + t.responsable : "", t.echeance ? "Échéance : " + t.echeance : ""].filter(Boolean).join(" · ");
    const r = await createInNotion("tache", t.titre, meta);
    created.push({ type: "Tâche", titre: t.titre + (meta ? " (" + meta + ")" : ""), ok: !!r.ok, url: r.url || "" });
  }

  return NextResponse.json({ resume: data.resume || "", created });
}
