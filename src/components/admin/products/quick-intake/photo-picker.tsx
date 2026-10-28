"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/admin/ui";
import { removeBackgroundFromBlob, uploadImageBlob } from "@/lib/images/remove-background-client";
import { composeStudioPhoto } from "@/lib/images/studio-photo-client";
import { downscale, toWebp } from "./image-utils";

type Variant = { url: string | null; status: string | null; failed?: boolean };

/**
 * Produktfoto af selve varen (uden pakke). Laver to versioner: (a) fritlagt på
 * lys baggrund med skygge og (b) AI-studiofoto. Praktikanten vælger én; (a) er
 * valgt, indtil der trykkes på (b).
 */
export function PhotoPicker({
  name,
  reuse,
  onChange,
}: {
  name: string;
  /** Aflæsningsfotoet, hvis varen lå løst (kan genbruges som produktfoto). */
  reuse: Blob | null;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [plain, setPlain] = useState<Variant>({ url: null, status: null });
  const [ai, setAi] = useState<Variant>({ url: null, status: null });
  const [chosen, setChosen] = useState<"plain" | "ai">("plain");
  const [error, setError] = useState<string | null>(null);

  function choose(which: "plain" | "ai", url: string | null) {
    setChosen(which);
    onChange(url);
  }

  async function makeAi(cut: Blob) {
    setAi({ url: null, status: "AI laver studiofoto" });
    try {
      const form = new FormData();
      form.append("image", cut, "cut.png");
      const res = await fetch("/api/admin/accessories/studio-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const webp = await toWebp(await res.blob());
      const url = await uploadImageBlob(webp, `${name}-ai.webp`, "accessories");
      setAi({ url, status: null });
    } catch {
      setAi({ url: null, status: null, failed: true });
    }
  }

  async function handle(file: Blob | undefined) {
    if (!file) return;
    setError(null);
    setPlain({ url: null, status: "Forbereder billede" });
    setAi({ url: null, status: null });
    choose("plain", null);
    try {
      const small = await downscale(file, 1600);
      const cut = await removeBackgroundFromBlob(small, (s) => setPlain({ url: null, status: s }));
      void makeAi(cut);
      setPlain({ url: null, status: "Laver produktbillede" });
      const studio = await composeStudioPhoto(cut);
      const url = await uploadImageBlob(studio, `${name}.webp`, "accessories");
      setPlain({ url, status: null });
      choose("plain", url);
    } catch {
      setPlain({ url: null, status: null });
      setError("Billedet kunne ikke behandles. Prøv igen med varen på en rolig baggrund.");
    }
  }

  const busy = plain.status != null;
  const tile = (which: "plain" | "ai", v: Variant, label: string) => (
    <button
      type="button"
      disabled={!v.url}
      onClick={() => choose(which, v.url)}
      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1 text-[12px] text-charcoal/70 ${
        chosen === which && v.url ? "border-[#1A3D2E]" : "border-transparent"
      }`}
    >
      {v.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.url} alt={label} className="h-32 w-32 rounded-md bg-cream object-contain" />
      ) : (
        <span className="flex h-32 w-32 items-center justify-center rounded-md bg-cream px-2 text-center">
          {v.status ?? (v.failed ? "Ikke tilgængelig" : "")}
        </span>
      )}
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
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
      {(plain.url || plain.status || ai.status || ai.url) && (
        <div className="flex gap-2">
          {tile("plain", plain, "Fritlagt")}
          {tile("ai", ai, "AI-studiofoto")}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => input.current?.click()} loading={busy}>
          {plain.url ? "Tag nyt billede" : busy ? plain.status : "Tag billede af varen"}
        </Button>
        {reuse && !plain.url && !busy && (
          <Button variant="secondary" onClick={() => void handle(reuse)}>Brug samme foto</Button>
        )}
      </div>
      {error && <p className="text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
