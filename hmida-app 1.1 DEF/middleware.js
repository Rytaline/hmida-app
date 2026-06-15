import { NextResponse } from "next/server";

// Porte d'entrée : tout est protégé sauf /login et les routes d'auth.
// L'équipe tape le code (APP_CODE) sur /login → un cookie signé (SESSION_SECRET) est posé.
// Les clés Notion / Claude ne transitent JAMAIS par le navigateur : tout se passe côté serveur.

const PUBLIC = ["/login", "/api/login", "/api/logout"];

export function middleware(req) {
  const secret = process.env.SESSION_SECRET;
  const code = process.env.APP_CODE;

  // Non configuré (dev local sans env) : on laisse passer.
  if (!secret || !code) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookie = req.cookies.get("hmida_auth")?.value;
  if (cookie === secret) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
