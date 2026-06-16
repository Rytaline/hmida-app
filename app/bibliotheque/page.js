"use client";
import { useEffect, useMemo, useState } from "react";
import "../globals.css";

const GENRE_ICON = {
  "Presse": "📰",
  "Institution / Rapport": "🏛️",
  "Science": "🔬",
  "TV / Vidéo": "🎬",
  "Radio / Podcast": "🎙️",
  "Corporate / OCP": "🏢",
  "Analyse / Plaidoyer": "✒️",
};

function uniq(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter(Boolean))];
}

export default function Bibliotheque() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [annee, setAnnee] = useState("");
  const [tag, setTag] = useState("");

  // recherche assistée par Hmida
  const [ask, setAsk] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askAns, setAskAns] = useState("");

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((j) => {
        if (j.error || !j.rows) setErr("Bibliothèque indisponible.");
        setRows(j.rows || []);
      })
      .catch(() => setErr("Erreur réseau."))
      .finally(() => setBusy(false));
  }, []);

  const genres = useMemo(() => uniq(rows, "genre").sort(), [rows]);
  const annees = useMemo(() => uniq(rows, "annee").sort().reverse(), [rows]);
  const tags = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => (r.tags || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => s.add(t)));
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !genre || r.genre === genre)
      .filter((r) => !annee || r.annee === annee)
      .filter((r) => !tag || (r.tags || "").includes(tag))
      .filter((r) => {
        if (!q) return true;
        return (r.titre + " " + r.source + " " + r.angle + " " + r.axe + " " + r.tags).toLowerCase().includes(q);
      });
  }, [rows, search, genre, annee, tag]);

  function reset() {
    setSearch(""); setGenre(""); setAnnee(""); setTag("");
  }

  async function askHmida(e) {
    e && e.preventDefault();
    if (!ask.trim() || askBusy) return;
    setAskBusy(true); setAskAns("");
    try {
      const r = await fetch("/api/hmida", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: "Dans la bibliothèque TELL'R, trouve-moi les articles/sources sur : " + ask + ". Donne 3 à 6 références exactes avec leur lien, classées par pertinence." }),
      });
      const j = await r.json();
      setAskAns(j.answer || j.error || "Pas de réponse.");
    } catch (_) {
      setAskAns("Erreur réseau.");
    } finally {
      setAskBusy(false);
    }
  }

  return (
    <div className="lib">
      <header className="lib-head">
        <div className="lib-h-left">
          <a href="/" className="lib-back">← Hmida</a>
          <div>
            <b>📚 Bibliothèque</b>
            <span className="lib-sub">Cadmium · OCP · Sécurité alimentaire</span>
          </div>
        </div>
        <div className="lib-count">{busy ? "…" : filtered.length + " / " + rows.length}</div>
      </header>

      <div className="lib-body">
        {/* Recherche assistée Hmida */}
        <form className="lib-ask" onSubmit={askHmida}>
          <div className="lib-ask-label">🤖 Demande à Hmida de trouver</div>
          <div className="lib-ask-row">
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="ex. réponses d'OCP en 2025, ou vidéos sur l'Afrique…"
            />
            <button type="submit" disabled={askBusy || !ask.trim()}>
              {askBusy ? "…" : "Chercher"}
            </button>
          </div>
          {askAns && <div className="lib-ask-ans">{askAns}</div>}
        </form>

        {/* Filtres */}
        <div className="lib-filters">
          <input
            className="lib-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 Rechercher un titre, un média, un angle…"
          />
          <div className="lib-chips">
            <span className="lib-chips-lbl">Genre</span>
            {genres.map((g) => (
              <button key={g} className={"lib-chip" + (genre === g ? " on" : "")} onClick={() => setGenre(genre === g ? "" : g)}>
                {(GENRE_ICON[g] || "•") + " " + g}
              </button>
            ))}
          </div>
          <div className="lib-chips">
            <span className="lib-chips-lbl">Année</span>
            {annees.map((a) => (
              <button key={a} className={"lib-chip" + (annee === a ? " on" : "")} onClick={() => setAnnee(annee === a ? "" : a)}>{a}</button>
            ))}
          </div>
          <div className="lib-chips">
            <span className="lib-chips-lbl">Tag</span>
            {tags.map((t) => (
              <button key={t} className={"lib-chip" + (tag === t ? " on" : "")} onClick={() => setTag(tag === t ? "" : t)}>{t}</button>
            ))}
            {(search || genre || annee || tag) && (
              <button className="lib-chip reset" onClick={reset}>✕ tout effacer</button>
            )}
          </div>
        </div>

        {err && <div className="lib-err">{err}</div>}
        {busy && <div className="lib-loading"><span className="spin" /> Chargement de la bibliothèque…</div>}

        {/* Résultats */}
        <div className="lib-list">
          {filtered.map((r) => (
            <a key={r.id} className="lib-card" href={r.url || "#"} target="_blank" rel="noreferrer">
              <div className="lib-card-top">
                <span className="lib-genre">{(GENRE_ICON[r.genre] || "•") + " " + r.genre}</span>
                <span className="lib-year">{r.annee}</span>
              </div>
              <div className="lib-title">{r.titre}</div>
              <div className="lib-meta">{[r.source, r.pays].filter(Boolean).join(" · ")}</div>
              {r.angle && <div className="lib-angle">{r.angle}</div>}
              <div className="lib-card-bottom">
                {(r.tags || "").split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} className="lib-tag">{t}</span>
                ))}
                {r.fiab && <span className={"lib-fiab" + (/prioritaire/i.test(r.fiab) ? " hi" : /v[ée]rifier|parti pris/i.test(r.fiab) ? " lo" : "")}>{r.fiab}</span>}
              </div>
            </a>
          ))}
          {!busy && !filtered.length && <div className="lib-empty">Aucune source ne correspond. Élargis les filtres.</div>}
        </div>
      </div>

      <style>{`
        .lib{min-height:100vh;background:var(--bg);color:var(--ink);}
        .lib-head{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:14px 22px;background:var(--bg);border-bottom:1px solid var(--border);}
        .lib-h-left{display:flex;align-items:center;gap:16px;}
        .lib-back{font-size:.8rem;color:var(--soft);text-decoration:none;border:1px solid var(--border);border-radius:8px;padding:6px 11px;transition:all .2s;}
        .lib-back:hover{border-color:var(--accent);color:var(--accent);}
        .lib-head b{font-family:var(--serif);font-size:1.25rem;display:block;}
        .lib-sub{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);}
        .lib-count{font-size:.8rem;color:var(--muted);font-variant-numeric:tabular-nums;}
        .lib-body{max-width:1000px;margin:0 auto;padding:22px;}
        .lib-ask{background:#FBEEE6;border:1px solid #E3C7B3;border-radius:10px;padding:14px 16px;margin-bottom:20px;animation:fadeUp .4s ease both;}
        .lib-ask-label{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-deep);font-weight:700;margin-bottom:9px;}
        .lib-ask-row{display:flex;gap:9px;}
        .lib-ask-row input{flex:1;border:1px solid var(--border);border-radius:9px;padding:10px 13px;font:inherit;font-size:.9rem;background:var(--surface);color:var(--ink);outline:none;}
        .lib-ask-row input:focus{border-color:var(--accent);}
        .lib-ask-row button{border:none;background:var(--accent);color:var(--bg);border-radius:9px;padding:0 18px;font-size:.84rem;cursor:pointer;transition:background .2s;}
        .lib-ask-row button:hover{background:var(--accent-deep);}
        .lib-ask-row button:disabled{opacity:.5;}
        .lib-ask-ans{margin-top:12px;padding-top:12px;border-top:1px solid #E3C7B3;font-size:.88rem;line-height:1.6;white-space:pre-wrap;}
        .lib-filters{margin-bottom:18px;}
        .lib-search{width:100%;border:1px solid var(--border);border-radius:10px;padding:11px 14px;font:inherit;font-size:.95rem;background:var(--surface);color:var(--ink);outline:none;margin-bottom:12px;}
        .lib-search:focus{border-color:var(--accent);}
        .lib-chips{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:8px;}
        .lib-chips-lbl{font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);width:46px;flex:none;}
        .lib-chip{font-size:.74rem;padding:5px 11px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--soft);cursor:pointer;transition:all .2s;}
        .lib-chip:hover{border-color:var(--accent);color:var(--accent);}
        .lib-chip.on{background:var(--accent);border-color:var(--accent);color:var(--bg);}
        .lib-chip.reset{color:var(--muted);border-style:dashed;}
        .lib-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:13px;}
        .lib-card{display:block;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 15px;text-decoration:none;color:var(--ink);transition:all .2s;animation:fadeUp .3s ease both;}
        .lib-card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 10px 24px rgba(94,59,42,.08);}
        .lib-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
        .lib-genre{font-size:.64rem;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);font-weight:600;}
        .lib-year{font-size:.7rem;color:var(--muted);font-variant-numeric:tabular-nums;}
        .lib-title{font-family:var(--serif);font-size:1.06rem;line-height:1.3;margin-bottom:6px;}
        .lib-meta{font-size:.74rem;color:var(--soft);margin-bottom:7px;}
        .lib-angle{font-size:.78rem;color:var(--soft);line-height:1.5;margin-bottom:10px;}
        .lib-card-bottom{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
        .lib-tag{font-size:.62rem;background:var(--bg2);color:var(--soft);border-radius:999px;padding:2px 8px;}
        .lib-fiab{font-size:.62rem;border-radius:999px;padding:2px 8px;margin-left:auto;background:var(--bg2);color:var(--muted);}
        .lib-fiab.hi{background:#E5EDE2;color:#4F6347;}
        .lib-fiab.lo{background:#F6E7DF;color:#9A5B3C;}
        .lib-loading,.lib-empty,.lib-err{padding:30px;text-align:center;color:var(--soft);font-size:.9rem;}
        .lib-err{color:#B0452F;}
        @media(max-width:560px){.lib-chips-lbl{width:100%;}}
      `}</style>
    </div>
  );
}
