import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCockpit } from "../../../lib/data";

export const runtime = "nodejs";
export const maxDuration = 45;

const SYS = `Tu es Hmida, compagnon TELL'R. Écris le BRIEF DU MATIN : un mot d'accueil bref et lucide qui oriente la journée à partir de l'état réel des bases.
Style : 4 à 6 lignes maximum, ton direct et chaleureux, pas de liste interminable. Hiérarchise : d'abord ce qui bloque ou urge, puis ce qui sort cette semaine, puis une seule priorité claire pour aujourd'hui. Nomme les personnes et les dates exactes. Si rien n'est en retard, dis-le franchement. Termine par une phrase courte qui met en mouvement. Français, markdown léger (gras autorisé, pas de titres).`;

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ brief: "" });
  try {
    const c = await buildCockpit();
    const ctx =
      "ÉTAT TELL'R (live) :\n" +
      "En retard : " + (c.late || []).map((x) => `${x.t} (${x.who || "?"}, ${x.when || "?"})`).join(" ; ") + "\n" +
      "Cette semaine : " + (c.week || []).map((x) => `${x.t} (${x.who || "?"}, ${x.when || "?"})`).join(" ; ") + "\n" +
      "Publications ≤7j : " + (c.pubs || []).map((x) => `${x.t} (${x.when || "?"})`).join(" ; ") + "\n" +
      "Vidéos en cours : " + (c.video || []).map((x) => `${x.t} (${x.st || "?"})`).join(" ; ");
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 500,
      temperature: 0.6,
      system: SYS,
      messages: [{ role: "user", content: ctx + "\n\nÉcris le brief du matin." }],
    });
    const brief = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return NextResponse.json({ brief });
  } catch (e) {
    return NextResponse.json({ brief: "" });
  }
}
