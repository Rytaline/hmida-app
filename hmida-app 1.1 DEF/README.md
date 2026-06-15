# HMIDA — app publique

Moteur de Sense Making de TELL'R. App Next.js (App Router) déployable sur Vercel.

- **Porte d'entrée** : code partagé (`APP_CODE`, défaut 6767), cookie de session signé.
- **Notion + Claude côté serveur** : les clés ne touchent jamais le navigateur.
- **Une page** : chat Hmida (recherche Notion → lecture documents → synthèse Claude typée).

## Déploiement
Voir **DEPLOIEMENT-HMIDA.md** (guide pas à pas, ~15 min).

## Variables d'environnement
Voir `.env.example`. Requises : `APP_CODE`, `SESSION_SECRET`, `NOTION_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`.

## Lancer en local (optionnel, pour développeur)
```bash
cp .env.example .env.local   # puis remplis les valeurs
npm install
npm run dev                  # http://localhost:3000
```

## Structure
```
app/
  page.js            UI chat Hmida (client)
  login/page.js      saisie du code
  api/hmida/route.js Notion search + lecture + Claude (serveur)
  api/login/route.js vérifie le code, pose le cookie
  api/logout/route.js
lib/notion.js        recherche + lecture de pages (@notionhq/client)
middleware.js        protège tout sauf /login
```
