import { NextResponse } from "next/server";

// Vérifie le code d'accès et pose le cookie de session.
export async function POST(req) {
  let code = "";
  try {
    const body = await req.json();
    code = (body && body.code ? String(body.code) : "").trim();
  } catch (_) {}

  const expected = (process.env.APP_CODE || "").trim();
  const secret = process.env.SESSION_SECRET || "";

  if (!expected || !secret) {
    return NextResponse.json(
      { ok: false, error: "App non configurée (APP_CODE / SESSION_SECRET manquants)." },
      { status: 500 }
    );
  }
  if (code !== expected) {
    return NextResponse.json({ ok: false, error: "Code incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("hmida_auth", secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });
  return res;
}
