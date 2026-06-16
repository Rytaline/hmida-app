import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createInNotion } from "../../../../lib/write";

export const runtime = "nodejs";
export const maxDuration = 45;

// Pour Brief et Script, Claude met d'abord en forme le texte brut au bon format livrable.
const REFORMAT = {
  brief: `Tu es Hmida. Transforme le texte en NOTE DE CADRAGE (brief) TELL'R, prête à partager. Structure stricte en markdown :
### Le vrai sujet
### Tension centrale
### Le système
### Angles morts
### Le sujet éditorial qui en sort
### Actions
(2-3 actions typées [Brief]/[Décision]/[Recherche], avec responsable suggéré). Garde les faits ; pas de chiffre sans source, sinon (à vérifier). Concis, dense. Français.`,
  script: `Tu es Hmida. Transforme le texte en SCRIPT « Workflow To Film » TELL'R, prêt à tourner. Structure en markdown :
### Angle & promesse
### Hook (3 options, < 3 s)
### Déroulé (beats : accroche → tension → bascule → résolution → chute)
### Voix off / texte à l'écran (extraits clés)
### Plan de tournage (ce qu'il faut filmer)
Garde les faits ; pas de chiffre inventé. Français.`,
};

async function reformat(target, title, text) {
  if (!REFORMAT[target] || !process.env.ANTHROPIC_API_KEY) return text;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1400,
      temperature: 0.5,
      system: REFORMAT[target],
      messages: [{ role: "user", content: "Sujet : " + title + "\n\nMatière brute :\n" + text }],
    });
    const out = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return out || text;
  } catch (_) {
    return text;
  }
}

export async function POST(req) {
  let target = "", title = "", text = "";
  try {
    const b = await req.json();
    target = b && b.target ? String(b.target) : "";
    title = b && b.title ? String(b.title) : "";
    text = b && b.text ? String(b.text) : "";
  } catch (_) {}

  if (!target || !title) {
    return NextResponse.json({ ok: false, error: "Cible ou titre manquant." }, { status: 400 });
  }

  const body = await reformat(target, title, text);
  const r = await createInNotion(target, title, body);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
