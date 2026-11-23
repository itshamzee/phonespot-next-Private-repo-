// src/app/(admin)/admin/indstillinger/profil/page.tsx
"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function ProfilPage() {
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState({ display_name: "", title: "", phone: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [pinState, setPinState] = useState({ hasPin: false, pinLocked: false });
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [password, setPassword] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
    loadPinState();
  }, []);

  async function loadPinState() {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (!res.ok) return;
      const me = await res.json();
      setPinState({ hasPin: Boolean(me.hasPin), pinLocked: Boolean(me.pinLocked) });
    } catch {
      // Uden status viser siden bare feltet til ny pinkode.
    }
  }

  async function handlePinSave() {
    setPinSaving(true);
    setPinMessage(null);
    try {
      const body: Record<string, string> = { pin };
      if (pinState.hasPin && pinState.pinLocked) body.password = password;
      else if (pinState.hasPin) body.currentPin = currentPin;
      const res = await fetch("/api/admin/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setPinMessage({ ok: true, text: "Pinkoden er gemt." });
        setPin("");
        setCurrentPin("");
        setPassword("");
      } else {
        setPinMessage({ ok: false, text: json.error ?? "Pinkoden kunne ikke gemmes. Prøv igen." });
      }
    } catch {
      setPinMessage({ ok: false, text: "Pinkoden kunne ikke gemmes, fordi forbindelsen fejlede." });
    }
    setPinSaving(false);
    await loadPinState();
  }

  const pinReady =
    /^\d{4,6}$/.test(pin) && (!pinState.hasPin || (pinState.pinLocked ? password !== "" : currentPin !== ""));

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { profile: p } = await res.json();
    if (p) setProfile({ display_name: p.display_name, title: p.title || "", phone: p.phone || "", avatar_url: p.avatar_url || "" });
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/admin/profile", {
      method: "PUT",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setMessage(res.ok ? "Profil gemt!" : "Fejl ved gemning");
  }

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600 as const, marginBottom: 4, color: "#374151" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Min profil</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Din profil bruges i email-signaturen når du svarer kunder.</p>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        <div>
          <label style={labelStyle}>Navn *</label>
          <input style={inputStyle} value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Titel</label>
          <input style={inputStyle} value={profile.title} placeholder="Fx Indehaver, Kundeservice" onChange={e => setProfile(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Telefon</label>
          <input style={inputStyle} value={profile.phone} placeholder="+45 XX XX XX XX" onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Profilbillede URL</label>
          <input style={inputStyle} value={profile.avatar_url} placeholder="https://..." onChange={e => setProfile(p => ({ ...p, avatar_url: e.target.value }))} />
          {profile.avatar_url && <img src={profile.avatar_url} alt="Avatar" style={{ width: 48, height: 48, borderRadius: "50%", marginTop: 8, objectFit: "cover" as const }} />}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || !profile.display_name}
        style={{ marginTop: 24, padding: "10px 24px", background: "#3A3D38", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        {saving ? "Gemmer..." : "Gem profil"}
      </button>
      {message && <p style={{ marginTop: 8, color: message.includes("Fejl") ? "red" : "#5A8C6F" }}>{message}</p>}

      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "40px 0 8px" }}>Pinkode</h2>
      <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
        Pinkoden på 4 til 6 cifre bruges, når du skifter ekspedient i kassen.
        {pinState.hasPin && !pinState.pinLocked && " Du har en pinkode. Skriv den nuværende for at skifte til en ny."}
        {pinState.hasPin && pinState.pinLocked && " Din pinkode er låst. Skriv din adgangskode til dette login for at sætte en ny."}
      </p>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        {pinState.hasPin && !pinState.pinLocked && (
          <div>
            <label style={labelStyle}>Nuværende pinkode</label>
            <input style={inputStyle} type="password" inputMode="numeric" autoComplete="off" value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          </div>
        )}
        {pinState.hasPin && pinState.pinLocked && (
          <div>
            <label style={labelStyle}>Adgangskode</label>
            <input style={inputStyle} type="password" autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
        )}
        <div>
          <label style={labelStyle}>{pinState.hasPin ? "Ny pinkode" : "Pinkode"}</label>
          <input style={inputStyle} type="password" inputMode="numeric" autoComplete="off" value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
      </div>
      <button onClick={handlePinSave} disabled={pinSaving || !pinReady}
        style={{ marginTop: 16, padding: "10px 24px", background: "#3A3D38", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        {pinSaving ? "Gemmer..." : pinState.hasPin ? "Skift pinkode" : "Sæt pinkode"}
      </button>
      {pinMessage && <p style={{ marginTop: 8, color: pinMessage.ok ? "#5A8C6F" : "red" }}>{pinMessage.text}</p>}
    </div>
  );
}
