"use client";
import { useEffect, useRef, useState } from "react";
import "./globals.css";

const MODES = [
  { id: "veille", ic: "🛰️", lab: "Veille", desc: "Cartographier une attaque : qui, portée, dangerosité, réponse." },
  { id: "analyse", ic: "🔍", lab: "Analyse", desc: "Disséquer le dossier : tension, acteurs, angles morts." },
  { id: "riposte", ic: "🛡️", lab: "Riposte", desc: "Construire le contre-récit sourcé : message, arguments, langage." },
  { id: "connaissance", ic: "📚", lab: "Connaissance", desc: "Tout savoir sur le groupe OCP : chiffres, sites, stratégie." },
];

const SUGG = {
  veille: [
    { lab: "Analyser une attaque", q: "Voici une attaque média contre OCP : [colle le titre/lien]. Cartographie-la : qui, portée, dangerosité, réponse recommandée." },
    { lab: "Le risque cadmium", q: "Quel est le niveau de risque médiatique du dossier cadmium pour OCP en ce moment, et quels signaux surveiller ?" },
  ],
  analyse: [
    { lab: "Tension du dossier cadmium", q: "Analyse le dossier cadmium/OCP : le vrai sujet, la tension centrale, le système d'acteurs et les angles morts (des deux côtés)." },
    { lab: "Double standard UE/Afrique", q: "Analyse l'accusation de « double standard » UE vs Afrique sur les engrais décadmiés. Qu'est-ce qui est solide, qu'est-ce qui manque ?" },
  ],
  riposte: [
    { lab: "Contre-récit cadmium", q: "Construis le contre-récit d'OCP sur le cadmium : message clé, 3 arguments sourcés, éléments de langage, pièges à éviter, trajectoire à mettre en avant." },
    { lab: "Répondre au « lobby russe »", q: "Comment répondre proprement à l'accusation que la défense d'OCP relève d'un « lobby russe », sans tomber dans le piège géopolitique ?" },
  ],
  connaissance: [
    { lab: "OCP en bref", q: "Présente le groupe OCP en bref : activités, position mondiale, sites clés, écosystème (UM6P, OCP Africa, Nutricrops)." },
    { lab: "Stratégie Afrique", q: "Quelle est la stratégie d'OCP en Afrique (sécurité alimentaire, engrais personnalisés, partenariats) ?" },
  ],
};

function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function mdToHtml(t) {
  const lines = esc(t).split("\n"); const out = []; let inList = false;
  const inl = (s) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>").replace(/`(.+?)`/g, "<b>$1</b>");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^-{3,}$/.test(l)) { if (inList) { out.push("</ul>"); inList = false; } out.push("<hr/>"); continue; }
    if (/^#{1,4}\s+/.test(l)) { if (inList) { out.push("</ul>"); inList = false; } out.push("<h4>" + inl(l.replace(/^#{1,4}\s+/, "")) + "</h4>"); continue; }
    if (/^[-•*]\s+/.test(l)) { if (!inList) { out.push("<ul>"); inList = true; } out.push("<li>" + inl(l.replace(/^[-•*]\s+/, "")) + "</li>"); continue; }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!l) { out.push('<div class="sp"></div>'); continue; }
    out.push("<p>" + inl(l) + "</p>");
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

const WELCOME = {
  who: "h",
  html:
    '<b>HMIDA — Hub de Monitoring, d\'Intelligence, de Défense & d\'Anticipation.</b> Le cerveau de veille et de riposte du groupe OCP. Je surveille les attaques, j\'analyse le dossier et j\'aide à construire une défense <i>sourcée</i> — pas de la propagande, des faits vérifiables.' +
    '<p><i>Choisis un mode, ou pose ta question.</i></p>',
};

export default function Hmida() {
  const [mode, setMode] = useState("veille");
  const [msgs, setMsgs] = useState([WELCOME]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const feedRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [msgs]);

  function push(m) { setMsgs((p) => [...p, m]); }
  function replaceLast(m) { setMsgs((p) => { const c = p.slice(); c[c.length - 1] = m; return c; }); }

  async function ask(preset, forceMode) {
    const text = (preset || q || "").trim();
    if (!text || busy) return;
    const useMode = forceMode || mode;
    setBusy(true);
    push({ who: "u", text });
    setQ("");
    if (taRef.current) taRef.current.style.height = "auto";
    push({ who: "h", loading: true });
    const history = msgs.filter((m) => !m.loading && (m.who === "u" ? m.text : m.raw)).map((m) => ({ role: m.who === "u" ? "user" : "assistant", content: m.who === "u" ? m.text : m.raw })).slice(-8);
    try {
      const r = await fetch("/api/ocp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: text, history, mode: useMode }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) replaceLast({ who: "h", html: '<span style="color:var(--soft)">' + esc(j.error || "Erreur.") + "</span>" });
      else { if (j.mode && j.mode !== mode) setMode(j.mode); replaceLast({ who: "h", raw: j.answer, html: mdToHtml(j.answer), sources: j.sources || [], q: text, rmode: j.mode || useMode }); }
    } catch (_) { replaceLast({ who: "h", html: '<span style="color:var(--soft)">Erreur réseau. Réessaie.</span>' }); }
    setBusy(false);
  }

  function copyMsg(e, raw) { if (navigator.clipboard) navigator.clipboard.writeText(raw || ""); const b = e.currentTarget; b.textContent = "✓ Copié"; setTimeout(() => (b.textContent = "⧉ Copier"), 1400); }
  function speak(text) { try { const s = window.speechSynthesis; if (!s) return; s.cancel(); const u = new SpeechSynthesisUtterance((text || "").replace(/[#*`>_|]/g, " ").slice(0, 1400)); u.lang = "fr-FR"; u.rate = 1.03; s.speak(u); } catch (_) {} }

  async function logout() { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }

  const cur = MODES.find((x) => x.id === mode) || MODES[0];

  return (
    <div className="app">
      <header>
        <div className="logo" style={{ background: "#1F4E46" }}>
          <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="OCP">
            <path d="M6 30 C 16 14, 22 20, 24 27 C 26 20, 32 14, 42 30 C 33 25, 28 27, 24 36 C 20 27, 15 25, 6 30 Z" fill="#fff" />
          </svg>
        </div>
        <div className="htxt">
          <b>HMIDA</b>
          <div className="sub">Monitoring · Intelligence · Défense · Anticipation — Groupe OCP</div>
        </div>
        <a className="hbtn" href="/bibliotheque" style={{ marginLeft: "auto" }} title="Bibliothèque : 80 sources OCP / cadmium">📚 Sources</a>
        <button className="hbtn" onClick={() => setMsgs([WELCOME])} title="Nouvelle session">🗑</button>
        <button className="hbtn" onClick={logout} title="Se déconnecter">Quitter</button>
      </header>

      <div className="modebar">
        {MODES.map((m) => (
          <button key={m.id} className={"mtab" + (mode === m.id ? " on" : "")} onClick={() => setMode(m.id)} title={m.desc}>
            <span>{m.ic}</span> {m.lab}
          </button>
        ))}
      </div>

      <div className="feed" ref={feedRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.who}>
            {m.who === "h" && <div className="av">🛰 HMIDA{m.rmode ? " · " + (MODES.find((x) => x.id === m.rmode) || {}).lab : ""}</div>}
            {m.who === "u" ? <span>{m.text}</span> : m.loading ? (
              <span style={{ color: "var(--soft)" }}><span className="spin"></span> J'analyse et je recoupe…</span>
            ) : (
              <>
                <div dangerouslySetInnerHTML={{ __html: m.html }} />
                {m.sources && m.sources.length > 0 && (
                  <div className="src">
                    <div className="lbl">Sources</div>
                    {m.sources.map((s, k) => (<a className="chip" key={k} href={s.url || "#"} target="_blank" rel="noreferrer">📄 {s.title || "Doc"}</a>))}
                  </div>
                )}
                {m.raw && (
                  <div className="acts">
                    <button onClick={(e) => copyMsg(e, m.raw)}>⧉ Copier</button>
                    <button onClick={() => speak(m.raw)}>🔊 Écouter</button>
                    <button onClick={() => ask(m.q, m.rmode)}>↻ Régénérer</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="footer">
        <div className="bar">
          <textarea ref={taRef} rows={1} value={q} placeholder="Une attaque à analyser, un angle à creuser, une riposte à bâtir…"
            onChange={(e) => { setQ(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }} />
          <button className="send" disabled={busy} onClick={() => ask()}>↑</button>
        </div>
        <div className="sugg">
          <span className="mode-pill" style={{ marginRight: 6 }}>{cur.ic} {cur.lab}</span>
          {(SUGG[mode] || []).map((f, i) => (<button key={i} onClick={() => ask(f.q)}>{f.lab}</button>))}
        </div>
      </div>
    </div>
  );
}
