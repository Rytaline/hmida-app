import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Pensée / blague du jour : un trait d'esprit léger, généré à chaque connexion.
export async function GET() {
  const fallback = { joke: "Le perfectionnisme, c'est de la procrastination en costume." };
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(fallback);
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 120,
      temperature: 1,
      system:
        "Tu es Hmida, compagnon créatif de TELL'R, plein d'esprit. Donne UNE pensée du jour très courte, drôle et maligne sur la création, le travail, les idées, l'art ou le sens — une pique qui fait sourire, jamais niaise ni corporate. 1 phrase (2 max). C'est TON trait d'esprit, pas une citation attribuée à quelqu'un. Réponds STRICTEMENT en JSON : {\"joke\":\"...\"}.",
      messages: [{ role: "user", content: "La pensée du jour." }],
    });
    const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const data = m ? JSON.parse(m[0]) : null;
    if (data && data.joke) return NextResponse.json({ joke: String(data.joke) });
  } catch (_) {}
  return NextResponse.json(fallback);
}
