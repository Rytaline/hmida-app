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
  for (const raw of lines) {
    const l = raw.trim();
    if (/^#{1,4}\s+/.test(l)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("<h4>" + inl(l.replace(/^#{1,4}\s+/, "")) + "</h4>");
      continue;
    }
    if (/^[-•*]\s+/.test(l)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + inl(l.replace(/^[-•*]\s+/, "")) + "</li>");
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!l) { out.push('<div class="sp"></div>'); continue; }
    out.push("<p>" + inl(l) + "</p>");
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
  const feedRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [msgs]);

  function push(m) {
    setMsgs((prev) => [...prev, m]);
  }

  async function ask(preset) {
    const text = (preset || q || "").trim();
    if (!text || busy) return;
    setBusy(true);
    push({ who: "u", text });
    setQ("");
    if (taRef.current) taRef.current.style.height = "auto";

    const idx = { i: 0 };
    push({ who: "h", loading: true });
    setMsgs((prev) => { idx.i = prev.length - 1; return prev; });

    // Historique pour la mémoire de conversation (on exclut l'accueil et le message en cours).
    const history = msgs
      .filter((m) => !m.loading && (m.who === "u" ? m.text : m.raw))
      .map((m) => ({ role: m.who === "u" ? "user" : "assistant", content: m.who === "u" ? m.text : m.raw }))
      .slice(-8);

    try {
      const r = await fetch("/api/hmida", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: text, history }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        replaceLast({ who: "h", html: '<span style="color:var(--soft)">' + esc(j.error || "Erreur.") + "</span>" });
      } else {
        replaceLast({ who: "h", raw: j.answer, html: mdToHtml(j.answer), sources: j.sources || [], q: text, notionUsed: j.notionUsed });
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
        <button className="hbtn" onClick={() => setMsgs(msgs.slice(0, 1))} title="Nouvelle conversation">🗑</button>
        <button className="hbtn" onClick={logout} title="Se déconnecter">Quitter</button>
      </header>

      <div className="feed" ref={feedRef}>
        {msgs.map((m, i) => (
          <div key={i} className={"msg " + m.who}>
            {m.who === "h" && <div className="av">✦ HMIDA</div>}
            {m.who === "u" ? (
              <span>{m.text}</span>
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
          <button className="send" disabled={busy} onClick={() => ask()}>↑</button>
        </div>
        <div className="sugg">
          {FN.map((f, i) => (
            <button key={i} onClick={() => ask(f.q)}>
              <span>{f.ic}</span>
              {f.lab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
