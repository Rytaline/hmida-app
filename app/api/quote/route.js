import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Citation inspirante générée à chaque connexion.
export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ quote: "Le doute est le commencement de la sagesse.", author: "Aristote" });
  }
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 200,
      temperature: 1,
      system:
        "Donne UNE seule citation authentique et inspirante d'un grand artiste, écrivain, penseur, scientifique ou créateur réel et reconnu, du monde entier (varie les époques, les cultures et les disciplines). La citation doit être réelle et correctement attribuée — choisis-en une que tu connais avec certitude, jamais inventée. Privilégie des citations sur la création, le sens, le courage de penser, l'art ou la connaissance. Réponds STRICTEMENT en JSON valide, sans rien d'autre : {\"quote\":\"...\",\"author\":\"...\"}.",
      messages: [{ role: "user", content: "Une citation, maintenant." }],
    });
    const raw = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const data = m ? JSON.parse(m[0]) : null;
    if (data && data.quote && data.author) {
      return NextResponse.json({ quote: String(data.quote), author: String(data.author) });
    }
  } catch (_) {}
  return NextResponse.json({ quote: "La simplicité est la sophistication suprême.", author: "Léonard de Vinci" });
}
