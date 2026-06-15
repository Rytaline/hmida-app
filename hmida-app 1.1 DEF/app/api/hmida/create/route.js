import { NextResponse } from "next/server";
import { createInNotion } from "../../../../lib/write";

export const runtime = "nodejs";

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
  const r = await createInNotion(target, title, text);
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
