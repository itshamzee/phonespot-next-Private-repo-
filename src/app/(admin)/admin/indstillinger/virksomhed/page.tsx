// src/app/(admin)/admin/indstillinger/virksomhed/page.tsx
"use client";
import { useState, useEffect } from "react";

export default function VirksomhedPage() {
  const [settings, setSettings] = useState({
    company_name: "", logo_url: "", address: "", postal_city: "",
    phone: "", email: "", website: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const res = await fetch("/api/admin/settings/company");
    const { settings: s } = await res.json();
    if (s) setSettings({
      company_name: s.company_name || "", logo_url: s.logo_url || "",
      address: s.address || "", postal_city: s.postal_city || "",
      phone: s.phone || "", email: s.email || "", website: s.website || "",
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setMessage(res.ok ? "Indstillinger gemt!" : "Fejl ved gemning");
  }

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600 as const, marginBottom: 4, color: "#374151" };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Virksomhedsoplysninger</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Bruges i email-signaturer og footers.</p>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
        <div>
          <label style={labelStyle}>Virksomhedsnavn</label>
          <input style={inputStyle} value={settings.company_name} onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Logo URL</label>
          <input style={inputStyle} value={settings.logo_url} placeholder="https://..." onChange={e => setSettings(s => ({ ...s, logo_url: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Adresse</label>
          <input style={inputStyle} value={settings.address} onChange={e => setSettings(s => ({ ...s, address: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Postnummer og by</label>
          <input style={inputStyle} value={settings.postal_city} placeholder="2200 København N" onChange={e => setSettings(s => ({ ...s, postal_city: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Telefon</label>
          <input style={inputStyle} value={settings.phone} onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} value={settings.email} onChange={e => setSettings(s => ({ ...s, email: e.target.value }))} />
        </div>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={settings.website} onChange={e => setSettings(s => ({ ...s, website: e.target.value }))} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ marginTop: 24, padding: "10px 24px", background: "#3A3D38", color: "#fff", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        {saving ? "Gemmer..." : "Gem indstillinger"}
      </button>
      {message && <p style={{ marginTop: 8, color: message.includes("Fejl") ? "red" : "#5A8C6F" }}>{message}</p>}
    </div>
  );
}
