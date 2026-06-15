# Mettre HMIDA en ligne — guide pas à pas

But : obtenir un lien public (ex. `hmida-tellr.vercel.app`) où ton équipe entre le **code 6767** et discute avec Hmida, branché sur ton Notion et Claude.

Temps : ~15 min. Aucune compétence technique requise — juste copier-coller.

---

## Ce dont tu as besoin (3 secrets)

Tu vas récupérer 3 valeurs et les coller plus tard dans Vercel. Garde-les de côté (un bloc-notes).

### 1. Le jeton Notion
1. Va sur **https://www.notion.so/my-integrations** → **New integration**.
2. Nom : `HMIDA`. Type : **Internal**. Valide.
3. Copie le **Internal Integration Secret** (commence par `secret_` ou `ntn_`). → c'est ton `NOTION_TOKEN`.
4. **Important** : ouvre ta page Notion **Pilotage TELL'R**, clique **•••** (en haut à droite) → **Connexions / Connections** → ajoute **HMIDA**. (Ça donne à Hmida le droit de lire tes bases. Fais-le sur la page parente, les bases en dessous suivent.)

### 2. La clé Claude
1. Va sur **https://console.anthropic.com/** → **API Keys** → **Create Key**.
2. Copie la clé (commence par `sk-ant-`). → c'est ton `ANTHROPIC_API_KEY`.

### 3. La clé de session (déjà générée pour toi)
Copie simplement cette valeur, c'est ton `SESSION_SECRET` :

```
d7b5b4f4940bda66a5572b824c5956d69a095c99c96eea4b7208c50ceabb894a
```

---

## Étape A — Mettre le code sur GitHub (gratuit)

1. Crée un compte sur **https://github.com** si tu n'en as pas.
2. Clique **New repository** (bouton vert). Nom : `hmida-app`. Laisse en **Private**. **Create**.
3. Sur la page du dépôt vide : clique **uploading an existing file**.
4. **Glisse-dépose le contenu** du dossier `hmida-app` (tous les fichiers et sous-dossiers — PAS le dossier `node_modules` s'il existe). Puis **Commit changes**.

> Astuce : tu peux glisser le dossier entier ; GitHub conserve la structure des sous-dossiers (`app/`, `lib/`…).

---

## Étape B — Déployer sur Vercel (gratuit)

1. Va sur **https://vercel.com** → **Sign up** → choisis **Continue with GitHub**.
2. Clique **Add New… → Project**.
3. En face de `hmida-app`, clique **Import**.
4. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute ces 5 lignes (Name = Value) :

| Name | Value |
|---|---|
| `APP_CODE` | `6767` |
| `SESSION_SECRET` | *(la valeur générée plus haut)* |
| `NOTION_TOKEN` | *(ton jeton Notion)* |
| `ANTHROPIC_API_KEY` | *(ta clé Claude)* |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` |

5. Clique **Deploy**. Attends ~1-2 min.
6. Vercel affiche un lien : `https://hmida-app-xxxx.vercel.app`. **C'est ton app.** 🎉

---

## Vérifier que tout marche

1. Ouvre le lien → tu vois la page **code**. Tape `6767` → **Entrer**.
2. Pose une question, ex. *« Quels sont nos angles morts sur la souveraineté ? »*.
3. Si Hmida cite des documents Notion en bas → la connexion Notion fonctionne. 👍

Si Hmida répond mais **sans sources Notion** : vérifie l'étape 1.4 (les bases doivent être partagées avec l'intégration HMIDA).

---

## Partager avec l'équipe

Envoie-leur **le lien + le code 6767**. C'est tout. Tout le monde utilise la même porte.

## Changer le code plus tard

Vercel → ton projet → **Settings → Environment Variables** → modifie `APP_CODE` → **Redeploy**.

## Rappels sécurité
- Tes clés (Notion, Claude) vivent **uniquement dans Vercel**, côté serveur. Les visiteurs ne les voient jamais.
- Le code 6767 est une **porte simple**, pas un coffre-fort : ne mets pas d'infos ultra-sensibles, et change-le si le lien fuite.
