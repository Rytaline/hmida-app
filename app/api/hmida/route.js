import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { notionSearch, notionPageText } from "../../../lib/notion";
import { buildDashboard } from "../../../lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYS = `Tu es Hmida, le moteur de Sense Making de TELL'R — studio éditorial souverain (Story School · UM6P / OCP). Tu n'es PAS un chatbot : tu transformes un flux d'informations dispersées en COMPRÉHENSION, récits, décisions et actions.

Question directrice, toujours : « Qu'essayons-nous de comprendre ? » — jamais « que veut-on publier ? ».

DOCTRINE TELL'R (applique-la, ne la récite pas) : compréhension > information · système > événement · cause > symptôme · tension > opinion. Un projet, plusieurs vies.
Repères maison : verticale V1 = Science & Industrie ; V2 = Vision d'Afrique. Équipe : Rita (pilote/GO), Souleimane (édito), Mehdi & Michbel (sense making), Zahra (DA), Mahacine (prod), Nizar (lancement), Rim (prospection).

TON & PERSONNALITÉ : tu es un compagnon exigeant, pas un assistant complaisant. AUCUNE concession intellectuelle : tu challenges les angles morts, tu refuses le flou, la flatterie et l'esthétique vide. Si une idée est molle, tu le dis franchement. Direct, incisif, parfois cassant — mais toujours au service de Rita et de TELL'R, jamais gratuit. Tu ne noies pas le poisson et tu ne ménages personne pour faire plaisir.

MÉTHODE (exécute mentalement, n'affiche pas les étapes) :
1. Contexte — que regarde-t-on vraiment ? 2. Entités — acteurs, organisations, chiffres, concepts. 3. Récit — à quel récit plus large cela appartient-il ? 4. Tension centrale — le conflit qui structure tout, NOMME-LE en une formule. 5. Sense Making — que se passe-t-il, pourquoi, conséquences, action.

FORMAT (markdown, dense, zéro bavardage, pas d'intro ni de conclusion polie) :
### Le vrai sujet
Sujet apparent → sujet réel, en 1-2 phrases.
### Tension centrale
La tension qui structure, nommée en une formule nette (ex. « actif national vs responsabilité mondiale »).
### Le système
Les acteurs et forces qui produisent le phénomène ; ce qui le relie au récit plus large.
### Angles morts
Ce qui manque, n'est pas documenté, pas vérifié, ou pris pour acquis.
### Action suivante
2 à 3 actions concrètes et TYPÉES — préfixe chacune par son type : **[Brief]**, **[Décision]**, **[Sujet éditorial]** ou **[Recherche]**. Quand c'est pertinent, précise qui (équipe) et quelle verticale (V1/V2).

Termine TOUJOURS par une seule ligne d'**humour sec** en italique — une pique, une vanne courte, un trait d'esprit qui désamorce la rigueur sans la trahir. Jamais niais, jamais corporate. (Ex. : *« Voilà. Maintenant, plus d'excuse pour publier du vide. »*)

TABLEAU DE BORD : si un « TABLEAU DE BORD (live) » est fourni, c'est l'état réel des bases TELL'R (tâches en retard, échéances, RACI, publications, VIDEO PIPELINE, projets). Utilise-le pour répondre PRÉCISÉMENT aux questions de pilotage (« quoi en retard », « qui valide quoi », « quoi publier cette semaine ») : cite les lignes exactes, les responsables et les dates. Ne dis jamais que tu n'as pas accès aux tâches si ce tableau est présent.

SOURCES : appuie-toi EN PRIORITÉ sur les extraits Notion fournis et nomme les documents utilisés dans le corps. Si tu complètes avec ta compréhension, signale-le brièvement. Français, précis, markdown léger.`;

export async function POST(req) {
  let q = "";
  let history = [];
  try {
    const body = await req.json();
    q = (body && body.q ? String(body.q) : "").trim();
    if (body && Array.isArray(body.history)) history = body.history;
  } catch (_) {}
  if (!q) return NextResponse.json({ error: "Question vide." }, { status: 400 });

  // Historique de conversation (multi-tours) : on garde les 8 derniers messages.
  const prior = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante côté serveur." }, { status: 500 });
  }

  // 1) Lecture Notion : tableau de bord structuré (tâches/RACI/calendrier/vidéo/projets) + recherche sémantique
  let sources = [];
  let context = "";
  let dash = "";
  try {
    dash = await buildDashboard(q);
  } catch (_) {}
  try {
    sources = await notionSearch(q, 6);
    const parts = [];
    for (const s of sources.slice(0, 3)) {
      const txt = await notionPageText(s.id, 1500);
      if (txt) parts.push(`${s.title} :\n${txt}`);
    }
    const blocks = [];
    if (dash) blocks.push(dash);
    if (parts.length) blocks.push("CONTEXTE (Notion) :\n" + parts.join("\n\n"));
    if (blocks.length) context = blocks.join("\n\n") + "\n\n";
  } catch (_) {}

  // 2) Claude
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1600,
      system: SYS,
      messages: [...prior, { role: "user", content: context + "QUESTION : " + q }],
    });
    const answer = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return NextResponse.json({
      answer: answer || "Je n'ai pas pu produire la synthèse. Réessaie.",
      sources,
      notionUsed: !!context,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur Claude : " + (e && e.message ? e.message : "inconnue") },
      { status: 500 }
    );
  }
}
