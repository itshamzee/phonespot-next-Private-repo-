// src/app/(admin)/admin/indstillinger/profil/page.tsx
"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export default function ProfilPage() {
  const supabase = createBrowserClient();
  const [profile, setProfile] = useState({ display_name: "", title: "", phone: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

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
    </div>
  );
}
