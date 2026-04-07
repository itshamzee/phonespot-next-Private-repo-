"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type Section = "profil" | "adgangskode" | "notifikationer" | "gdpr";

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-[#E5E5EA] px-5 py-4">
      <h2 className="text-sm font-semibold text-[#111111]">{title}</h2>
      <p className="mt-0.5 text-xs text-[#6E6E73]">{description}</p>
    </div>
  );
}

export default function IndstillingerPage() {
  const [loadingData, setLoadingData] = useState(true);

  // Profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Marketing consent
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [marketingMsg, setMarketingMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // GDPR export
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  // Account deletion
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRequesting, setDeleteRequesting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/customer", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.customer?.name ?? "");
        setPhone(data.customer?.phone ?? "");
        setMarketingConsent(data.customer?.marketing_consent ?? false);
      }
      setLoadingData(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg({ type: "err", text: "Navn er paakraevet" });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingProfile(false); return; }

    const res = await fetch("/api/customer", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
    });

    setSavingProfile(false);
    if (res.ok) {
      setProfileMsg({ type: "ok", text: "Profil opdateret" });
    } else {
      setProfileMsg({ type: "err", text: "Kunne ikke gemme. Prov igen." });
    }
    setTimeout(() => setProfileMsg(null), 4000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "err", text: "Adgangskoden skal vaere mindst 8 tegn" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "Adgangskoderne stemmer ikke overens" });
      return;
    }

    setSavingPassword(true);

    // Re-authenticate first with current password to verify identity
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setSavingPassword(false);
        setPasswordMsg({ type: "err", text: "Den nuvaerende adgangskode er forkert" });
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordMsg({ type: "err", text: "Kunne ikke opdatere adgangskode. Prov igen." });
    } else {
      setPasswordMsg({ type: "ok", text: "Adgangskode er opdateret" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setTimeout(() => setPasswordMsg(null), 4000);
  }

  async function handleSaveMarketing() {
    setSavingMarketing(true);
    setMarketingMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingMarketing(false); return; }

    const res = await fetch("/api/customer", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ marketing_consent: marketingConsent }),
    });

    setSavingMarketing(false);
    if (res.ok) {
      setMarketingMsg({ type: "ok", text: "Indstillinger gemt" });
    } else {
      setMarketingMsg({ type: "err", text: "Kunne ikke gemme. Prov igen." });
    }
    setTimeout(() => setMarketingMsg(null), 4000);
  }

  async function handleExportData() {
    setExporting(true);
    setExportMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setExporting(false); return; }

    const res = await fetch("/api/gdpr/export", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setExporting(false);

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mine-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setExportMsg("Eksporten mislykkedes. Prov igen.");
    }
  }

  async function handleDeleteRequest() {
    setDeleteRequesting(true);
    setDeleteMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeleteRequesting(false); return; }

    // Send a request — we treat this as a support ticket (no dedicated endpoint yet)
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch("/api/reklamation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        order_id: null,
        description: "GDPR - Anmodning om sletning af konto og persondata.",
        contact_email: user?.email ?? "",
        type: "account_deletion",
      }),
    }).catch(() => null);

    setDeleteRequesting(false);
    setDeleteConfirm(false);

    if (res?.ok) {
      setDeleteMsg({ type: "ok", text: "Din anmodning er modtaget. Vi behandler den inden for 30 dage og sender bekraeftelse til din email." });
    } else {
      // Fallback: send email directly
      setDeleteMsg({ type: "ok", text: "Send en email til hej@phonespot.dk med emnet 'Anmodning om sletning' for at fuldfoere processen." });
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#1A3D2E]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Indstillinger</h1>
        <p className="mt-1 text-sm text-[#6E6E73]">Administrer din konto og privatlivsindstillinger</p>
      </div>

      {/* Profile section */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
        <SectionHeader
          title="Profil"
          description="Opdater dit navn og telefonnummer"
        />
        <form onSubmit={handleSaveProfile} className="space-y-4 px-5 py-5">
          <div>
            <label className="block text-sm font-medium text-[#111111]">Fuldt navn</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              placeholder="Fornavn Efternavn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">Telefon</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              placeholder="+45 12 34 56 78"
            />
          </div>
          {profileMsg && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${
                profileMsg.type === "ok"
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-red-50 text-red-700 ring-red-200"
              }`}
            >
              {profileMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-[#1A3D2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
          >
            {savingProfile ? "Gemmer..." : "Gem aendringer"}
          </button>
        </form>
      </div>

      {/* Password section */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
        <SectionHeader
          title="Skift adgangskode"
          description="Vaelg en stærk adgangskode pa mindst 8 tegn"
        />
        <form onSubmit={handleChangePassword} className="space-y-4 px-5 py-5">
          <div>
            <label className="block text-sm font-medium text-[#111111]">Nuvaerende adgangskode</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">Ny adgangskode</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              placeholder="Min. 8 tegn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111]">Bekraeft ny adgangskode</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#E5E5EA] px-4 py-2.5 text-sm text-[#111111] placeholder-[#AEAEB2] focus:border-[#1A3D2E] focus:outline-none focus:ring-2 focus:ring-[#1A3D2E]/10"
              placeholder="••••••••"
            />
          </div>
          {passwordMsg && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${
                passwordMsg.type === "ok"
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-red-50 text-red-700 ring-red-200"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-lg bg-[#1A3D2E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#143324] disabled:opacity-50"
          >
            {savingPassword ? "Opdaterer..." : "Opdater adgangskode"}
          </button>
        </form>
      </div>

      {/* Marketing consent */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
        <SectionHeader
          title="Notifikationer"
          description="Styring af kommunikation fra PhoneSpot"
        />
        <div className="px-5 py-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#E5E5EA] accent-[#1A3D2E]"
            />
            <div>
              <p className="text-sm font-medium text-[#111111]">Markedsforing og tilbud</p>
              <p className="mt-0.5 text-xs text-[#6E6E73]">
                Modtag emails om nye produkter, tilbud og nyheder fra PhoneSpot. Du kan til enhver tid
                afmelde dig.
              </p>
            </div>
          </label>
          {marketingMsg && (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${
                marketingMsg.type === "ok"
                  ? "bg-green-50 text-green-700 ring-green-200"
                  : "bg-red-50 text-red-700 ring-red-200"
              }`}
            >
              {marketingMsg.text}
            </div>
          )}
          <button
            onClick={handleSaveMarketing}
            disabled={savingMarketing}
            className="mt-4 rounded-lg border border-[#E5E5EA] px-5 py-2.5 text-sm font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC] hover:text-[#111111] disabled:opacity-50"
          >
            {savingMarketing ? "Gemmer..." : "Gem indstillinger"}
          </button>
        </div>
      </div>

      {/* GDPR */}
      <div className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
        <SectionHeader
          title="Dine data (GDPR)"
          description="Eksporter eller anmod om sletning af dine personoplysninger"
        />
        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-sm font-medium text-[#111111]">Eksporter dine data</p>
            <p className="mt-0.5 text-xs text-[#6E6E73]">
              Download en komplet kopi af dine personoplysninger i JSON-format.
            </p>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="mt-3 rounded-lg border border-[#E5E5EA] px-4 py-2 text-sm font-medium text-[#6E6E73] transition hover:bg-[#F5F2EC] hover:text-[#111111] disabled:opacity-50"
            >
              {exporting ? "Eksporterer..." : "Download mine data"}
            </button>
            {exportMsg && (
              <p className="mt-2 text-sm text-red-600">{exportMsg}</p>
            )}
          </div>

          <div className="border-t border-[#E5E5EA] pt-4">
            <p className="text-sm font-medium text-[#111111]">Slet konto</p>
            <p className="mt-0.5 text-xs text-[#6E6E73]">
              Anmod om permanent sletning af din konto og alle tilknyttede personoplysninger. Dette kan
              ikke fortrydes.
            </p>
            {deleteMsg ? (
              <div
                className={`mt-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${
                  deleteMsg.type === "ok"
                    ? "bg-green-50 text-green-700 ring-green-200"
                    : "bg-red-50 text-red-700 ring-red-200"
                }`}
              >
                {deleteMsg.text}
              </div>
            ) : deleteConfirm ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Er du sikker? Denne handling kan ikke fortrydes.
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Vi sender en bekraeftelse til din email inden vi sletter dine data.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDeleteRequest}
                    disabled={deleteRequesting}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                  >
                    {deleteRequesting ? "Sender anmodning..." : "Bekraeft sletning"}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Annuller
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50"
              >
                Anmod om kontosletning
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
