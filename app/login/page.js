"use client";
import { useState } from "react";
import "../globals.css";

export default function Login() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (r.ok) {
        try { localStorage.setItem("hmida_name", name.trim()); } catch (_) {}
        window.location.href = "/";
      } else {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || "Code incorrect.");
        setBusy(false);
      }
    } catch (_) {
      setErr("Erreur réseau. Réessaie.");
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-logo">
          <svg width="30" height="30" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label="TELL'R">
            <path d="M6 30 C 16 14, 22 20, 24 27 C 26 20, 32 14, 42 30 C 33 25, 28 27, 24 36 C 20 27, 15 25, 6 30 Z" fill="#fff" />
          </svg>
        </div>
        <h1>HMIDA</h1>
        <div className="sub">Moteur de Sense Making · TELL'R</div>
        <input
          className="gate-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton prénom"
          aria-label="Ton prénom"
        />
        <input
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="• • • •  (code)"
          aria-label="Code d'accès"
        />
        <button type="submit" disabled={busy || !code || !name.trim()}>
          {busy ? "Vérification…" : "Entrer"}
        </button>
        <div className="gate-err">{err}</div>
      </form>
    </div>
  );
}
