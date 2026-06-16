"use client";
import { useEffect, useRef, useState } from "react";
import "./globals.css";

const FN = [
  { ic: "📝", lab: "Brief", q: "Brief : produis une note de cadrage structurée sur le cadmium dans les phosphates — tension centrale, système, angles morts, et le sujet éditorial qui en sort." },
  { ic: "🎙", lab: "Réunion → décisions", q: "Meeting Intelligence : transforme mes notes de réunion en décisions, actions (avec responsable suggéré) et sujets à suivre." },
  { ic: "📡", lab: "Récits émergents", q: "Narrative Intelligence : quels récits émergent, dominent ou se contredisent autour d'OCP et de la souveraineté ?" },
  { ic: "📚", lab: "Que sait-on déjà ?", q: "Knowledge Explorer : que savons-nous déjà sur l'eau et la souveraineté dans nos sources ? Cartographie ce qui est documenté." },
  { ic: "🕳", lab: "Nos angles morts", q: "Gap Detection : quels sont nos angles morts sur la souveraineté alimentaire — ce qu'on ne documente pas encore ?" },
  { ic: "♟", lab: "Conseil stratégique", q: "Strategic Advisor : devons-nous lancer la collection « Ressources stratégiques » ? Opportunités, risques, alignement avec la doctrine." },
  { ic: "✨", lab: "Inspiration", q: "Raconte-moi une histoire vraie et inspirante d'un grand artiste, penseur ou créateur — je veux me détendre et me remettre en mouvement.", mode: "inspiration" },
];

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
    // Tableau Markdown : ligne | … | suivie d'une ligne séparatrice |---|
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

export default function Hmida() {
  const [msgs, setMsgs] = useState([
    {
      who: "h",
      html:
        '<b>Hmida — votre compagnon TELL\'R.</b><br>Connecté à ton Notion, tes tâches, ton calendrier et Claude. Je ne demande pas « que veux-tu publier ? » mais <i>« qu\'essayons-nous de comprendre ? »</i>.' +
        '<h4>Ce que je sais faire</h4><ul>' +
        '<li><b>Cadrer un sujet flou</b> jusqu\'à sa tension centrale.</li>' +
        '<li><b>Lire ton Notion</b> et citer mes sources.</li>' +
        '<li><b>Transformer une réunion</b> en décisions et actions.</li>' +
        '<li><b>Traquer tes angles morts</b> — ce que tu évites de regarder.</li>' +
        '<li><b>Te dire go / no-go</b>, avec les risques. Pas pour te flatter.</li>' +
        '<li><b>Garder le fil</b> de notre échange.</li></ul>' +
        '<p>Je ne fais pas de concessions : si une idée est molle, je te le dis. Mais je finis toujours par te faire (un peu) sourire.</p>' +
        '<i>Alors — qu\'essayons-nous de comprendre ?</i>',
    },
  ]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(null);
  const [joke, setJoke] = useState("");
  const [urgent, setUrgent] = useState(null);
  const [userName, setUserName] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [listening, setListening] = useState(false);
  const [convo, setConvo] = useState(false);
  const feedRef = useRef(null);
  const taRef = useRef(null);
  const recRef = useRef(null);
  const convoRef = useRef(false);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [msgs]);

  // À la connexion : citation + blague du jour + urgence du jour + prénom
  useEffect(() => {
    try { const nm = localStorage.getItem("hmida_name") || ""; setUserName(nm); setSpeaker(nm); } catch (_) {}
    fetch("/api/quote").then((r) => r.json()).then((d) => { if (d && d.quote) setQuote(d); }).catch(() => {});
    fetch("/api/joke").then((r) => r.json()).then((d) => { if (d && d.joke) setJoke(d.joke); }).catch(() => {});
    fetch("/api/urgent").then((r) => r.json()).then((d) => { if (d && Array.isArray(d.items)) setUrgent(d); }).catch(() => {});
  }, []);

  function push(m) {
    setMsgs((prev) => [...prev, m]);
  }

  async function ask(preset, mode) {
    const text = (preset || q || "").trim();
    if (!text || busy) return;
    setBusy(true);
    const who = (speaker || "").trim();
    push({ who: "u", text, speaker: who });
    setQ("");
    if (taRef.current) taRef.current.style.height = "auto";

    const idx = { i: 0 };
    push({ who: "h", loading: true });
    setMsgs((prev) => { idx.i = prev.length - 1; return prev; });

    // Historique pour la mémoire de conversation (on exclut l'accueil et le message en cours).
    const history = msgs
      .filter((m) => !m.loading && (m.who === "u" ? m.text : m.raw))
      .map((m) => ({ role: m.who === "u" ? "user" : "assistant", content: m.who === "u" ? ((m.speaker ? m.speaker + " : " : "") + m.text) : m.raw }))
      .slice(-8);
    const apiQ = who ? who + " : " + text : text;

    try {
      const r = await fetch("/api/hmida", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: apiQ, history, mode: mode || "" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        replaceLast({ who: "h", html: '<span style="color:var(--soft)">' + esc(j.error || "Erreur.") + "</span>" });
      } else {
        replaceLast({ who: "h", raw: j.answer, html: mdToHtml(j.answer), sources: j.sources || [], q: text, notionUsed: mode === "inspiration" ? true : j.notionUsed });
        if (convoRef.current) speak(j.answer, () => { if (convoRef.current) startListening(); });
      }
    } catch (_) {
      replaceLast({ who: "h", html: '<span style="color:var(--soft)">Erreur réseau. Réessaie.</span>' });
    }
    setBusy(false);
  }

  function replaceLast(m) {
    setMsgs((prev) => {
      const copy = prev.slice();
      copy[copy.length - 1] = m;
      return copy;
    });
  }

  function copyMsg(e, raw) {
    if (navigator.clipboard) navigator.clipboard.writeText(raw || "");
    const b = e.currentTarget;
    b.textContent = "✓ Copié";
    setTimeout(() => (b.textContent = "⧉ Copier"), 1400);
  }

  // ── Voix : Hmida lit ses réponses (TTS) et t'écoute (STT) ──
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

  async function createDoc(target, m, e) {
    const btn = e && e.currentTarget;
    const labels = { video: "🎬 Vidéo", tache: "✅ Tâche", decision: "🧠 Décision" };
    if (btn) btn.textContent = "…";
    let title = (m.q || (m.raw || "").split("\n")[0] || "Sans titre").trim();
    title = title.replace(/^[^:\n]{0,32}:\s*/, "").slice(0, 90); // enlève un préfixe type "Brief :"
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

  return (
    <div className="app">
      <header>
        <div className="logo">
          <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="TELL'R">
            <path d="M6 30 C 16 14, 22 20, 24 27 C 26 20, 32 14, 42 30 C 33 25, 28 27, 24 36 C 20 27, 15 25, 6 30 Z" fill="#fff" />
          </svg>
        </div>
        <div className="htxt">
          <b>HMIDA 1.1</b>
          <div className="sub">Votre compagnon TELL'R · Sense Making</div>
        </div>
        <span className="mode" style={{ marginLeft: "auto" }}>● Notion + Claude</span>
        <button className={"hbtn" + (convo ? " active" : "")} onClick={toggleConvo} title="Mode conversation mains libres (Hmida lit et t'écoute)">🎙️ {convo ? "Conversation ON" : "Conversation"}</button>
        <button className="hbtn" onClick={() => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} setMsgs(msgs.slice(0, 1)); }} title="Nouvelle conversation">🗑</button>
        <button className="hbtn" onClick={logout} title="Se déconnecter">Quitter</button>
      </header>

      <div className="feed" ref={feedRef}>
        {urgent && urgent.items && urgent.items.length > 0 && (
          <div className="urgent">
            <div className="urgent-head">🔥 Urgence du jour</div>
            <ul>
              {urgent.items.map((it, i) => (
                <li key={i}>
                  <b>{it.t || "—"}</b>
                  {it.who ? <span className="u-meta"> · {it.who}</span> : null}
                  {it.when ? <span className="u-meta"> · {it.when}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {quote && (
          <div className="quote">
            <span className="q-mark">“</span>
            <span className="q-text">{quote.quote}</span>
            <span className="q-author">— {quote.author}</span>
          </div>
        )}
        {joke && <div className="joke">✦ {joke}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.who}>
            {m.who === "h" && <div className="av">✦ HMIDA</div>}
            {m.who === "u" ? (
              <>
                {m.speaker ? <div className="speaker-tag">{m.speaker}</div> : null}
                <span>{m.text}</span>
              </>
            ) : m.loading ? (
              <span style={{ color: "var(--soft)" }}>
                <span className="spin"></span> Je relie et structure…
              </span>
            ) : (
              <>
                <div dangerouslySetInnerHTML={{ __html: m.html }} />
                {m.sources && m.sources.length > 0 && (
                  <div className="src">
                    <div className="lbl">Sources Notion</div>
                    {m.sources.map((s, k) => (
                      <a className="chip" key={k} href={s.url || "#"} target="_blank" rel="noreferrer">
                        📄 {s.title || "Doc"}
                      </a>
                    ))}
                  </div>
                )}
                {m.raw && (
                  <div className="acts">
                    <button onClick={(e) => copyMsg(e, m.raw)}>⧉ Copier</button>
                    <button onClick={() => speak(m.raw)}>🔊 Écouter</button>
                    <button onClick={() => ask(m.q)}>↻ Régénérer</button>
                    <span className="acts-sep">·  créer :</span>
                    <button onClick={(e) => createDoc("video", m, e)}>🎬 Vidéo</button>
                    <button onClick={(e) => createDoc("tache", m, e)}>✅ Tâche</button>
                    <button onClick={(e) => createDoc("decision", m, e)}>🧠 Décision</button>
                  </div>
                )}
                {m.notionUsed === false && m.raw && (
                  <div className="note">Réponse sans extrait Notion (aucun document trouvé ou bases non partagées avec l'intégration).</div>
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
        </div>
        <div className="bar">
          <textarea
            ref={taRef}
            rows={1}
            value={q}
            placeholder="Qu'essayons-nous de comprendre ?"
            onChange={(e) => {
              setQ(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
          <button className={"mic" + (listening ? " on" : "")} onClick={toggleMic} title="Parler à Hmida">{listening ? "●" : "🎤"}</button>
          <button className="send" disabled={busy} onClick={() => ask()}>↑</button>
        </div>
        <div className="sugg">
          {FN.map((f, i) => (
            <button key={i} onClick={() => ask(f.q, f.mode)}>
              <span>{f.ic}</span>
              {f.lab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
