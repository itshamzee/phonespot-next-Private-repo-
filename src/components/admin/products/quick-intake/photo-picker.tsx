"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Chip } from "@/components/admin/ui";
import { removeBackgroundFromBlob, uploadImageBlob } from "@/lib/images/remove-background-client";
import { composeStudioPhoto } from "@/lib/images/studio-photo-client";
import { cutoutFromLightbox } from "@/lib/images/lightbox";
import { downscale, toWebp } from "./image-utils";

type Variant = { url: string | null; status: string | null; failed?: boolean };
type Mode = "lightbox" | "cutout";
const MODE_KEY = "ps_photo_mode";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "cutout" ? "cutout" : "lightbox";
  } catch {
    return "lightbox";
  }
}

/**
 * Produktfoto af selve varen (uden pakke).
 * - Lysboks (standard): baggrunden fjernes med ren pixelbehandling, under et sekund.
 * - Fritlæg: AI-model i browseren til fotos uden lysboks (langsomt på ældre telefoner).
 * AI-studiofoto (OpenAI) laves kun, når man trykker på knappen, og vælges bagefter.
 */
export function PhotoPicker({ name, onChange }: { name: string; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const cutRef = useRef<Blob | null>(null);
  const runRef = useRef(0);
  const [mode, setMode] = useState<Mode>("lightbox");
  const [plain, setPlain] = useState<Variant>({ url: null, status: null });
  const [ai, setAi] = useState<Variant>({ url: null, status: null });
  const [chosen, setChosen] = useState<"plain" | "ai">("plain");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMode(readMode()), []);

  function changeMode(next: Mode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* kun en bekvemmelighed */
    }
  }

  function choose(which: "plain" | "ai", url: string | null) {
    setChosen(which);
    onChange(url);
  }

  async function makeAi() {
    const cut = cutRef.current;
    if (!cut) return;
    const run = runRef.current;
    setAi({ url: null, status: "AI laver studiofoto (ca. 30 sek.)" });
    try {
      const form = new FormData();
      form.append("image", cut, "cut.png");
      const res = await fetch("/api/admin/accessories/studio-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const webp = await toWebp(await res.blob());
      const url = await uploadImageBlob(webp, `${name}-ai.webp`, "accessories");
      if (run === runRef.current) setAi({ url, status: null });
    } catch {
      if (run === runRef.current) setAi({ url: null, status: null, failed: true });
    }
  }

  async function handle(file: Blob | undefined) {
    if (!file) return;
    const run = ++runRef.current;
    setError(null);
    setAi({ url: null, status: null });
    choose("plain", null);
    try {
      let cut: Blob;
      if (mode === "lightbox") {
        setPlain({ url: null, status: "Behandler billede" });
        cut = await cutoutFromLightbox(file);
      } else {
        setPlain({ url: null, status: "Forbereder billede" });
        const small = await downscale(file, 1280);
        cut = await removeBackgroundFromBlob(small, (s) => setPlain({ url: null, status: s }));
      }
      if (run !== runRef.current) return;
      cutRef.current = cut;
      setPlain({ url: null, status: "Gemmer billede" });
      const studio = await composeStudioPhoto(cut);
      const url = await uploadImageBlob(studio, `${name}.webp`, "accessories");
      if (run !== runRef.current) return;
      setPlain({ url, status: null });
      choose("plain", url);
    } catch {
      if (run !== runRef.current) return;
      setPlain({ url: null, status: null });
      setError(
        mode === "lightbox"
          ? "Billedet kunne ikke behandles. Prøv igen, eller vælg Fritlæg, hvis du ikke bruger lysboks."
          : "Billedet kunne ikke behandles. Prøv igen med varen på en rolig baggrund.",
      );
    }
  }

  const busy = plain.status != null;
  const showAiTile = ai.status != null || ai.url != null;
  const tile = (which: "plain" | "ai", v: Variant, label: string) => (
    <button
      type="button"
      disabled={!v.url}
      onClick={() => choose(which, v.url)}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-1 text-[12px] text-charcoal/70 ${
        chosen === which && v.url ? "border-[#1A3D2E]" : "border-transparent"
      }`}
    >
      {v.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.url} alt={label} className="aspect-square w-full rounded-md bg-cream object-contain" />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center rounded-md bg-cream px-2 text-center">
          {v.status ?? (v.failed ? "Ikke tilgængelig" : "")}
        </span>
      )}
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <Chip size="sm" selected={mode === "lightbox"} onToggle={() => changeMode("lightbox")}>Lysboks (hurtig)</Chip>
        <Chip size="sm" selected={mode === "cutout"} onToggle={() => changeMode("cutout")}>Uden lysboks</Chip>
      </div>
      {(plain.url || plain.status) && (
        <div className="flex gap-2">
          {tile("plain", plain, "Produktbillede")}
          {showAiTile && tile("ai", ai, "AI-studiofoto")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={plain.url ? "secondary" : "primary"}
          className="h-12 flex-1 text-[15px]"
          onClick={() => input.current?.click()}
          loading={busy}
        >
          {plain.url ? "Tag nyt billede" : busy ? plain.status : "Tag billede af varen"}
        </Button>
      </div>
      {plain.url && !showAiTile && !ai.failed && (
        <button type="button" className="text-[13px] text-charcoal/60 underline" onClick={() => void makeAi()}>
          Lav også et AI-studiofoto (ca. 30 sek.)
        </button>
      )}
      {error && <p className="text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
