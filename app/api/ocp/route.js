import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { notionSearch, notionPageText } from "../../../lib/notion";
import { libraryDigest } from "../../../lib/library";
import { resolveOcpMode, pickOcpSystem } from "../../../lib/ocp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  let q = "", history = [], mode = "";
  try {
    const b = await req.json();
    q = (b && b.q ? String(b.q) : "").trim();
    if (b && Array.isArray(b.history)) history = b.history;
    if (b && b.mode) mode = String(b.mode);
  } catch (_) {}
  if (!q) return NextResponse.json({ error: "Question vide." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Clé API manquante côté serveur." }, { status: 500 });

  const resolved = resolveOcpMode(mode, q);

  const prior = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  // Contexte : bibliothèque OCP (80 sources) + dossier de veille, en parallèle.
  let sources = [];
  let context = "";
  try {
    const [lib, searchResults] = await Promise.all([
      libraryDigest(q, 16).catch(() => ""),
      notionSearch(q, 5).catch(() => []),
    ]);
    sources = searchResults;
    const fetched = await Promise.all(
      sources.slice(0, 3).map((s) => notionPageText(s.id, 1500).then((t) => (t ? `${s.title} :\n${t}` : "")).catch(() => ""))
    );
    const blocks = [];
    if (lib) blocks.push(lib);
    const parts = fetched.filter(Boolean);
    if (parts.length) blocks.push("DOSSIER & NOTES (Notion) :\n" + parts.join("\n\n"));
    if (blocks.length) context = blocks.join("\n\n") + "\n\n";
  } catch (_) {}

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1800,
      temperature: 0.5,
      system: pickOcpSystem(resolved),
      messages: [...prior, { role: "user", content: context + "QUESTION : " + q }],
    });
    const answer = (msg.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return NextResponse.json({ answer: answer || "Je n'ai pas pu produire l'analyse. Réessaie.", sources, mode: resolved });
  } catch (e) {
    return NextResponse.json({ error: "Erreur Claude : " + (e && e.message ? e.message : "inconnue") }, { status: 500 });
  }
}
