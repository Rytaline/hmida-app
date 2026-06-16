"use client";
import { useEffect, useRef, useState } from "react";
import "./globals.css";

const MODES = [
  { id: "sensemaking", ic: "🧠", lab: "Sense Making", desc: "Comprendre : tension, système, angles morts." },
  { id: "edito", ic: "🎬", lab: "Édito", desc: "Transformer en récit filmable : hook, structure, voix." },
  { id: "production", ic: "🗂", lab: "Production", desc: "Piloter : qui fait quoi, deadlines, pipeline." },
  { id: "veille", ic: "📚", lab: "Veille", desc: "Documenter : sources réelles, fact-check, angles morts." },
  { id: "inspiration", ic: "✨", lab: "Inspiration", desc: "Respirer : une histoire vraie pour se remettre en mouvement." },
];

const SUGG = {
  sensemaking: [
    { lab: "Cadrer un sujet flou", q: "Cadre ce sujet jusqu'à sa tension centrale : le cadmium dans les phosphates et la souveraineté d'OCP." },
    { lab: "Nos angles morts", q: "Quels sont nos angles morts sur la souveraineté alimentaire — ce qu'on ne documente pas encore ?" },
    { lab: "Go / No-go", q: "Devons-nous lancer la collection « Ressources stratégiques » ? Opportunités, risques, alignement doctrine." },
  ],
  edito: [
    { lab: "Script Workflow To Film", q: "Écris un script Workflow To Film pour une vidéo courte sur le cadmium et OCP." },
    { lab: "3 hooks", q: "Donne-moi 3 hooks qui arrêtent le scroll sur la guerre des normes du phosphate." },
    { lab: "Angle d'un sujet", q: "Quel angle narratif pour parler de la sécurité alimentaire africaine sans tomber dans le récit corporate ?" },
  ],
  production: [
    { lab: "Qu'est-ce qui bloque ?", q: "Qu'est-ce qui est en retard ou sur le chemin critique cette semaine ? Donne le plan d'action." },
    { lab: "Rétroplanning 1re vidéo", q: "Propose un rétroplanning pour la première vidéo du 26 juin, avec responsables et étapes." },
    { lab: "État du pipeline", q: "Fais le point sur le VIDEO PIPELINE : où en est chaque vidéo et quelle est la prochaine action ?" },
  ],
  veille: [
    { lab: "Que dit la bibliothèque ?", q: "Que disent nos sources sur le cadmium et OCP ? Cite-les avec leurs liens." },
    { lab: "À charge / à décharge", q: "Sur le dossier cadmium, oppose les sources à charge et à décharge, avec leurs liens." },
    { lab: "Trouver des articles", q: "Trouve-moi les articles et vidéos sur la sécurité alimentaire en Afrique, classés par pertinence." },
  ],
  inspiration: [
    { lab: "Une histoire", q: "Raconte-moi une histoire vraie et inspirante d'un grand artiste, penseur ou créateur." },
  ],
};

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdToHtml(t) {
  const lines = esc(t).split("\n");
  const out = [];
  let inList = false;
  const inl = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\*(.+?)\*/g, "<i>$1</i>")
      .replace(/`(.+?)`/g, "<b>$1</b>");
  const isRow = (s) => /^\|.*\|\s*$/.test(s);
  const isSep = (s) => /^\|?[\s:|-]*-{2,}[\s:|-]*\|?$/.test(s) && s.includes("-");
  const cells = (s) => s.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
  let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (isRow(l) && i + 1 < lines.length && isSep(lines[i + 1].trim())) {
      if (inList) { out.push("</ul>"); inList = false; }
      const header = cells(l);
      let j = i + 2;
      const rows = [];
      while (j < lines.length && isRow(lines[j].trim())) { rows.push(cells(lines[j].trim())); j++; }
      let tbl = '<table><thead><tr>' + header.map((h) => "<th>" + inl(h) + "</th>").join("") + "</tr></thead><tbody>";
      tbl += rows.map((r) => "<tr>" + r.map((c) => "<td>" + inl(c) + "</td>").join("") + "</tr>").join("");
      tbl += "</tbody></table>";
      out.push(tbl);
      i = j;
      continue;
    }
    if (/^-{3,}$/.test(l)) { if (inList) { out.push("</ul>"); inList = false; } out.push("<hr/>"); i++; continue; }
    if (/^#{1,4}\s+/.test(l)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<h4>" + inl(l.replace(/^#{1,4}\s+/, "")) + "</h4>");
      i++; continue;
    }
    if (/^[-•*]\s+/.test(l)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + inl(l.replace(/^[-•*]\s+/, "")) + "</li>");
      i++; continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!l) { out.push('<div class="sp"></div>'); i++; continue; }
    out.push("<p>" + inl(l) + "</p>");
    i++;
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

const WELCOME = {
  who: "h",
  html:
    '<b>Hmida 2.0 — le cerveau opérant de TELL\'R.</b> Je me souviens de l\'équipe, des projets et des décisions. Choisis un mode ci-dessus, ou demande-moi simplement <i>« qu\'essayons-nous de comprendre ? »</i>.',
};

export default function Hmida() {
  const [view, setView] = useState("cockpit"); // cockpit | chat
  const [mode, setMode] = useState("sensemaking");
  const [cockpit, setCockpit] = useState(null);
  const [brief, setBrief] = useState("");
  const [briefBusy, setBriefBusy] = useState(true);

  const [msgs, setMsgs] = useState([WELCOME]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(null);
  const [joke, setJoke] = useState("");
  const [userName, setUserName] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [listening, setListening] = useState(false);
  const [convo, setConvo] = useState(false);
  const [daily, setDaily] = useState("");
  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyRes, setDailyRes] = useState(null);
  const [dailyListening, setDailyListening] = useState(false);
  const feedRef = useRef(null);
  const taRef = useRef(null);
  const recRef = useRef(null);
  const convoRef = useRef(false);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [msgs, view]);

  useEffect(() => {
    try { const nm = localStorage.getItem("hmida_name") || ""; setUserName(nm); setSpeaker(nm); } catch (_) {}
    fetch("/api/quote").then((r) => r.json()).then((d) => { if (d && d.quote) setQuote(d); }).catch(() => {});
    fetch("/api/joke").then((r) => r.json()).then((d) => { if (d && d.joke) setJoke(d.joke); }).catch(() => {});
    fetch("/api/cockpit").then((r) => r.json()).then((d) => setCockpit(d)).catch(() => setCockpit({ error: true }));
    fetch("/api/brief").then((r) => r.json()).then((d) => { setBrief((d && d.brief) || ""); setBriefBusy(false); }).catch(() => setBriefBusy(false));
  }, []);

  function push(m) { setMsgs((prev) => [...prev, m]); }
  function replaceLast(m) {
    setMsgs((prev) => { const c = prev.slice(); c[c.length - 1] = m; return c; });
  }

  function goChat(m) {
    if (m) setMode(m);
    setView("chat");
  }

  async function ask(preset, forceMode) {
    const text = (preset || q || "").trim();
    if (!text || busy) return;
    const useMode = forceMode || mode;
    setView("chat");
    setBusy(true);
    const who = (speaker || "").trim();
    push({ who: "u", text, speaker: who });
    setQ("");
    if (taRef.current) taRef.current.style.height = "auto";
    push({ who: "h", loading: true });

    const history = msgs
      .filter((m) => !m.loading && (m.who === "u" ? m.text : m.raw))
      .map((m) => ({ role: m.who === "u" ? "user" : "assistant", content: m.who === "u" ? ((m.speaker ? m.speaker + " : " : "") + m.text) : m.raw }))
      .slice(-8);
    const apiQ = who ? who + " : " + text : text;

    try {
      const r = await fetch("/api/hmida", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: apiQ, history, mode: useMode }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        replaceLast({ who: "h", html: '<span style="color:var(--soft)">' + esc(j.error || "Erreur.") + "</span>" });
      } else {
        if (j.mode && j.mode !== mode) setMode(j.mode);
        replaceLast({ who: "h", raw: j.answer, html: mdToHtml(j.answer), sources: j.sources || [], q: text, notionUsed: useMode === "inspiration" ? true : j.notionUsed, rmode: j.mode || useMode });
        if (convoRef.current) speak(j.answer, () => { if (convoRef.current) startListening(); });
      }
    } catch (_) {
      replaceLast({ who: "h", html: '<span style="color:var(--soft)">Erreur réseau. Réessaie.</span>' });
    }
    setBusy(false);
  }

  function copyMsg(e, raw) {
    if (navigator.clipboard) navigator.clipboard.writeText(raw || "");
    const b = e.currentTarget;
    b.textContent = "✓ Copié";
    setTimeout(() => (b.textContent = "⧉ Copier"), 1400);
  }

  function speak(text, then) {
    try {
      const synth = window.speechSynthesis;
      if (!synth) { if (then) then(); return; }
      synth.cancel();
      const clean = (text || "").replace(/[#*`>_|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1400);
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "fr-FR"; u.rate = 1.03;
      if (then) u.onend = then;
      synth.speak(u);
    } catch (_) { if (then) then(); }
  }

  function startListening() {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { alert("La dictée vocale n'est pas disponible sur ce navigateur — essaie Chrome."); return; }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = "fr-FR"; rec.interimResults = false; rec.maxAlternatives = 1;
      setListening(true);
      rec.onresult = (e) => { const tr = e.results[0][0].transcript; setListening(false); if (tr && tr.trim()) ask(tr); };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
    } catch (_) { setListening(false); }
  }

  function toggleMic() {
    if (listening) { try { recRef.current && recRef.current.stop(); } catch (_) {} setListening(false); }
    else { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} startListening(); }
  }

  function toggleConvo() {
    const next = !convo;
    setConvo(next); convoRef.current = next;
    if (!next) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} }
  }

  // ── Daily : capter une réunion → décisions + tâches dans Notion ──
  async function captureDaily() {
    if (!daily.trim() || dailyBusy) return;
    setDailyBusy(true); setDailyRes(null);
    try {
      const r = await fetch("/api/hmida/meeting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript: daily }),
      });
      const j = await r.json().catch(() => ({}));
      setDailyRes(r.ok ? j : { error: j.error || "Erreur." });
    } catch (_) {
      setDailyRes({ error: "Erreur réseau." });
    }
    setDailyBusy(false);
  }

  function dictateDaily() {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { alert("Dictée indisponible — essaie Chrome."); return; }
    try {
      const rec = new SR();
      rec.lang = "fr-FR"; rec.interimResults = false; rec.continuous = true; rec.maxAlternatives = 1;
      setDailyListening(true);
      recRef.current = rec;
      rec.onresult = (e) => {
        let txt = "";
        for (let i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript + " ";
        setDaily((d) => (d ? d + " " : "") + txt.trim());
      };
      rec.onerror = () => setDailyListening(false);
      rec.onend = () => setDailyListening(false);
      rec.start();
    } catch (_) { setDailyListening(false); }
  }
  function stopDictateDaily() {
    try { recRef.current && recRef.current.stop(); } catch (_) {}
    setDailyListening(false);
  }

  async function createDoc(target, m, e) {
    const btn = e && e.currentTarget;
    const labels = { brief: "📝 Brief", script: "🎬 Script", tache: "✅ Tâche", decision: "🧠 Décision", memoire: "💾 Mémoriser" };
    if (btn) btn.textContent = "…";
    let title = (m.q || (m.raw || "").split("\n")[0] || "Sans titre").trim();
    title = title.replace(/^[^:\n]{0,32}:\s*/, "").slice(0, 90);
    try {
      const r = await fetch("/api/hmida/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target, title, text: m.raw }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        push({ who: "h", html: '✓ Créé dans Notion (' + labels[target] + ') : <a class="chip" href="' + (j.url || "#") + '" target="_blank" rel="noreferrer">ouvrir ↗</a>' });
      } else {
        push({ who: "h", html: '<span style="color:var(--soft)">Échec de création : ' + esc(j.error || "erreur") + "</span>" });
      }
    } catch (_) {
      push({ who: "h", html: '<span style="color:var(--soft)">Erreur réseau à la création.</span>' });
    }
    if (btn) btn.textContent = labels[target];
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const cur = MODES.find((x) => x.id === mode) || MODES[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  function StatList({ icon, title, items, render, empty }) {
    return (
      <div className="ck-card">
        <div className="ck-card-h">{icon} {title} <span className="ck-n">{items ? items.length : 0}</span></div>
        {items && items.length ? (
          <ul>{items.map((it, i) => <li key={i}>{render(it)}</li>)}</ul>
        ) : (
          <div className="ck-empty">{empty}</div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="logo">
          <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="TELL'R">
            <path d="M6 30 C 16 14, 22 20, 24 27 C 26 20, 32 14, 42 30 C 33 25, 28 27, 24 36 C 20 27, 15 25, 6 30 Z" fill="#fff" />
          </svg>
        </div>
        <div className="htxt">
          <b>HMIDA 2.0</b>
          <div className="sub">Cerveau opérant · TELL'R</div>
        </div>
        <div className="vtabs">
          <button className={"vtab" + (view === "cockpit" ? " on" : "")} onClick={() => setView("cockpit")}>◧ Cockpit</button>
          <button className={"vtab" + (view === "chat" ? " on" : "")} onClick={() => setView("chat")}>✦ Hmida</button>
          <button className={"vtab" + (view === "daily" ? " on" : "")} onClick={() => setView("daily")}>📝 Daily</button>
        </div>
        <a className="hbtn" href="/bibliotheque" title="Bibliothèque : 80 articles, vidéos et rapports">📚 Articles</a>
        <button className={"hbtn" + (convo ? " active" : "")} onClick={toggleConvo} title="Conversation mains libres">🎙️ {convo ? "ON" : "Voix"}</button>
        <button className="hbtn" onClick={() => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} setMsgs([WELCOME]); }} title="Nouvelle conversation">🗑</button>
        <button className="hbtn" onClick={logout} title="Se déconnecter">Quitter</button>
      </header>

      {view === "cockpit" ? (
        <div className="cockpit">
          <div className="ck-hero">
            <div className="ck-hello">{hello}{userName ? ", " + userName : ""}.</div>
            <div className="ck-date">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
          </div>

          <div className="ck-brief">
            <div className="ck-brief-h">☀️ Brief du matin</div>
            {briefBusy ? (
              <div className="ck-brief-load"><span className="spin"></span> Hmida lit l'état de TELL'R…</div>
            ) : brief ? (
              <div dangerouslySetInnerHTML={{ __html: mdToHtml(brief) }} />
            ) : (
              <div className="ck-empty">Brief indisponible (bases non connectées ou rien à signaler).</div>
            )}
          </div>

          <div className="ck-grid">
            <StatList icon="🔴" title="Ce qui bloque" items={cockpit && cockpit.late} empty="Rien en retard. Respire."
              render={(it) => <><b>{it.t || "—"}</b>{it.who ? <span className="ck-meta"> · {it.who}</span> : null}{it.when ? <span className="ck-meta"> · {it.when}</span> : null}</>} />
            <StatList icon="🗓" title="Cette semaine" items={cockpit && cockpit.week} empty="Aucune échéance à 7 jours."
              render={(it) => <><b>{it.t || "—"}</b>{it.who ? <span className="ck-meta"> · {it.who}</span> : null}{it.when ? <span className="ck-meta"> · {it.when}</span> : null}</>} />
            <StatList icon="📤" title="À publier (≤7j)" items={cockpit && cockpit.pubs} empty="Rien de programmé."
              render={(it) => <><b>{it.t || "—"}</b>{it.plat ? <span className="ck-meta"> · {it.plat}</span> : null}{it.when ? <span className="ck-meta"> · {it.when}</span> : null}</>} />
            <StatList icon="🎬" title="Pipeline vidéo" items={cockpit && cockpit.video} empty="Pipeline vide."
              render={(it) => <><b>{it.t || "—"}</b>{it.st ? <span className="ck-meta"> · {it.st}</span> : null}{it.who ? <span className="ck-meta"> · {it.who}</span> : null}</>} />
            <StatList icon="✅" title="RACI ouvert" items={cockpit && cockpit.raci} empty="Rien d'ouvert."
              render={(it) => <><b>{it.t || "—"}</b>{it.who ? <span className="ck-meta"> · {it.who}</span> : null}{it.when ? <span className="ck-meta"> · {it.when}</span> : null}</>} />
          </div>

          <div className="ck-modes">
            <div className="ck-modes-h">Par quoi commence-t-on ?</div>
            <div className="ck-modes-row">
              {MODES.map((m) => (
                <button key={m.id} className="ck-mode" onClick={() => goChat(m.id)}>
                  <span className="ck-mode-ic">{m.ic}</span>
                  <span className="ck-mode-lab">{m.lab}</span>
                  <span className="ck-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {quote && (
            <div className="quote">
              <span className="q-mark">“</span>
              <span className="q-text">{quote.quote}</span>
              <span className="q-author">— {quote.author}</span>
            </div>
          )}
          {joke && <div className="joke">✦ {joke}</div>}
        </div>
      ) : view === "chat" ? (
        <>
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
                {m.who === "h" && <div className="av">✦ HMIDA{m.rmode ? " · " + (MODES.find((x) => x.id === m.rmode) || {}).lab : ""}</div>}
                {m.who === "u" ? (
                  <>
                    {m.speaker ? <div className="speaker-tag">{m.speaker}</div> : null}
                    <span>{m.text}</span>
                  </>
                ) : m.loading ? (
                  <span style={{ color: "var(--soft)" }}><span className="spin"></span> Je relie et structure…</span>
                ) : (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: m.html }} />
                    {m.sources && m.sources.length > 0 && (
                      <div className="src">
                        <div className="lbl">Sources Notion</div>
                        {m.sources.map((s, k) => (
                          <a className="chip" key={k} href={s.url || "#"} target="_blank" rel="noreferrer">📄 {s.title || "Doc"}</a>
                        ))}
                      </div>
                    )}
                    {m.raw && (
                      <div className="acts">
                        <button onClick={(e) => copyMsg(e, m.raw)}>⧉ Copier</button>
                        <button onClick={() => speak(m.raw)}>🔊 Écouter</button>
                        <button onClick={() => ask(m.q, m.rmode)}>↻ Régénérer</button>
                        <span className="acts-sep">·  produire :</span>
                        <button onClick={(e) => createDoc("brief", m, e)}>📝 Brief</button>
                        <button onClick={(e) => createDoc("script", m, e)}>🎬 Script</button>
                        <button onClick={(e) => createDoc("tache", m, e)}>✅ Tâche</button>
                        <button onClick={(e) => createDoc("decision", m, e)}>🧠 Décision</button>
                        <button onClick={(e) => createDoc("memoire", m, e)}>💾 Mémoriser</button>
                      </div>
                    )}
                    {m.notionUsed === false && m.raw && (
                      <div className="note">Réponse sans extrait Notion (aucun document trouvé ou bases non partagées).</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="footer">
            <div className="speaker-row">
              <span>✍ qui écrit&nbsp;:</span>
              <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="prénom" aria-label="Qui écrit" />
              <span className="mode-pill">{cur.ic} {cur.lab}</span>
            </div>
            <div className="bar">
              <textarea
                ref={taRef}
                rows={1}
                value={q}
                placeholder={mode === "inspiration" ? "Demande une histoire…" : "Qu'essayons-nous de comprendre ?"}
                onChange={(e) => { setQ(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
              />
              <button className={"mic" + (listening ? " on" : "")} onClick={toggleMic} title="Parler à Hmida">{listening ? "●" : "🎤"}</button>
              <button className="send" disabled={busy} onClick={() => ask()}>↑</button>
            </div>
            <div className="sugg">
              {(SUGG[mode] || []).map((f, i) => (
                <button key={i} onClick={() => ask(f.q)}>{f.lab}</button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="cockpit">
          <div className="ck-hero">
            <div className="ck-hello">📝 Daily → décisions</div>
          </div>
          <p className="daily-intro">Colle ou dicte le compte-rendu du daily. Hmida en extrait les <b>décisions</b> et les <b>tâches</b> (avec responsable), et les écrit directement dans Notion.</p>
          <textarea className="daily-ta" value={daily} onChange={(e) => setDaily(e.target.value)} placeholder="Notes du daily, ou clique 🎤 Dicter…" />
          <div className="daily-actions">
            <button className={"mic" + (dailyListening ? " on" : "")} onClick={dailyListening ? stopDictateDaily : dictateDaily}>{dailyListening ? "● stop" : "🎤 Dicter"}</button>
            <button className="daily-go" disabled={dailyBusy || !daily.trim()} onClick={captureDaily}>{dailyBusy ? "Capture…" : "Capter → Notion"}</button>
            {daily && <button className="daily-clear" onClick={() => { setDaily(""); setDailyRes(null); }}>Effacer</button>}
          </div>
          {dailyRes && dailyRes.error && <div className="lib-err" style={{ color: "#B0452F" }}>{dailyRes.error}</div>}
          {dailyRes && !dailyRes.error && (
            <div className="daily-res">
              {dailyRes.resume && <div className="ck-brief"><div className="ck-brief-h">Résumé</div><p>{dailyRes.resume}</p></div>}
              {(dailyRes.created || []).map((c, i) => (
                <div key={i} className="daily-item">
                  <span className="daily-type">{c.type}</span>
                  <span className="daily-titre">{c.titre}</span>
                  {c.ok && c.url ? <a className="chip" href={c.url} target="_blank" rel="noreferrer">ouvrir ↗</a> : <span style={{ color: "#B0452F", fontSize: ".7rem" }}>échec</span>}
                </div>
              ))}
              {(!dailyRes.created || !dailyRes.created.length) && <div className="ck-empty">Aucune décision ni tâche détectée.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
