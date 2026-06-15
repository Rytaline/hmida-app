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

SOURCES : appuie-toi EN PRIORITÉ sur les extraits Notion fournis et nomme les documents utilisés dans le corps. Si tu complètes avec ta compréhension, signale-le brièvement.

CHIFFRES & FAITS (règle non négociable — c'est la doctrine TELL'R) : ne donne JAMAIS un chiffre, une date, un seuil, un pourcentage ou une statistique précise sans source. Si la donnée vient d'un extrait Notion, nomme le document. Sinon, marque-la explicitement **(à vérifier)**. Tu n'as pas le droit d'avoir l'assurance d'un expert sans la source : mieux vaut « de l'ordre de X (à vérifier) » qu'un faux précis qui serait publié tel quel. Si tu ne sais pas, dis-le.

Français, précis, markdown léger.`;

const SYS_INSPIRATION = `Tu es Hmida, en MODE INSPIRATION. Ici tu poses l'analyse : tu deviens un conteur, chaleureux et apaisant. Raconte UNE histoire vraie et inspirante autour d'un grand artiste, écrivain, penseur, scientifique ou créateur réel (varie les figures, les cultures, les époques). Montre l'obstacle ou le doute, le moment de bascule, et ce qu'on en retient pour créer avec intention. Ton doux, rythme lent, comme une histoire qu'on écoute le soir. 200-300 mots, prose fluide, sans titres ni jargon ni listes. Reste fidèle aux faits : pas de citations ni de dates inventées. Termine par une seule phrase douce qui donne envie de s'y remettre. Français.`;

export async function POST(req) {
  let q = "";
  let history = [];
  let mode = "";
  try {
    const body = await req.json();
    q = (body && body.q ? String(body.q) : "").trim();
    if (body && Array.isArray(body.history)) history = body.history;
    if (body && body.mode) mode = String(body.mode);
  } catch (_) {}
  if (!q) return NextResponse.json({ error: "Question vide." }, { status: 400 });

  const inspiration = mode === "inspiration";

  // Historique de conversation (multi-tours) : on garde les 8 derniers messages.
  const prior = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY manquante côté serveur." }, { status: 500 });
  }

  // 1) Lecture Notion : tableau de bord structuré + recherche sémantique, EN PARALLÈLE
  //    (sautée en mode inspiration : on raconte une histoire, pas les données)
  let sources = [];
  let context = "";
  if (!inspiration) try {
    // Dashboard et recherche lancés en même temps
    const [dash, searchResults] = await Promise.all([
      buildDashboard(q).catch(() => ""),
      notionSearch(q, 6).catch(() => []),
    ]);
    sources = searchResults;
    // Lecture des 3 premières pages en parallèle
    const fetched = await Promise.all(
      sources.slice(0, 3).map((s) =>
        notionPageText(s.id, 1500)
          .then((txt) => (txt ? `${s.title} :\n${txt}` : ""))
          .catch(() => "")
      )
    );
    const parts = fetched.filter(Boolean);
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
      max_tokens: inspiration ? 1000 : 1600,
      temperature: inspiration ? 1 : 0.7,
      system: inspiration ? SYS_INSPIRATION : SYS,
      messages: [...prior, { role: "user", content: context + (inspiration ? q : "QUESTION : " + q) }],
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
