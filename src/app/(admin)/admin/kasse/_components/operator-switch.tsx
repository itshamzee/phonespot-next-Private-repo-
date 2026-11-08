"use client";

import { useCallback, useEffect, useState } from "react";
import { posFetch } from "@/lib/pos/client";
import { Modal, btnSecondary } from "./dialogs";

type Operator = { id: string; name: string };
type StaffEntry = { id: string; name: string; hasPin: boolean };

const MAX_PIN = 6;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const keyClass =
  "h-14 rounded-[10px] border border-[#C9D0C7] bg-white text-xl font-semibold text-[#15211B] transition-colors hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Ekspedient-chip i kassens topbjÃ¦lke. Et klik Ã¥bner en liste over butikkens
 * medarbejdere; efter valg af navn tastes pinkoden pÃ¥ taltastaturet eller det
 * fysiske tastatur. Serveren afgÃ¸r adgang og lÃ¥sning, og beskederne vises som de er.
 */
export function OperatorSwitch({
  locationId,
  onChanged,
}: {
  locationId: string;
  onChanged: (current: Operator | null) => void;
}) {
  const [current, setCurrent] = useState<Operator | null>(null);
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [loggedInName, setLoggedInName] = useState("");
  const [loggedInId, setLoggedInId] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<StaffEntry | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await posFetch("/api/admin/me", { cache: "no-store" });
        if (!res.ok) return;
        const me = (await res.json()) as { id?: string; name?: string };
        if (cancelled) return;
        if (me.name) setLoggedInName(me.name);
        if (me.id) setLoggedInId(me.id);
      } catch {
        // Uden navn viser knappen blot "Tilbage".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!locationId) return;
    try {
      const res = await posFetch(`/api/pos/operator?location_id=${locationId}`, { cache: "no-store" });
      if (!res.ok) {
        setCurrent(null);
        setStaff([]);
        return;
      }
      const data = (await res.json()) as { current?: Operator; staff?: StaffEntry[] };
      setCurrent(data.current ?? null);
      setStaff(data.staff ?? []);
    } catch {
      // Chippen vises ikke, hvis serveren ikke svarer.
    }
  }, [locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  function close() {
    setOpen(false);
    setPicked(null);
    setPin("");
    setError("");
    setLocked(false);
  }

  function pickStaff(s: StaffEntry) {
    setPicked(s);
    setPin("");
    setError("");
    setLocked(false);
  }

  const submit = useCallback(
    async (code: string) => {
      if (!picked || busy || locked || code.length < 4) return;
      setBusy(true);
      setError("");
      try {
        const res = await posFetch("/api/pos/operator", {
          method: "POST",
          body: JSON.stringify({ staffId: picked.id, pin: code, locationId }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; current?: Operator };
        if (res.ok && body.current) {
          setCurrent(body.current);
          close();
          onChanged(body.current);
          return;
        }
        setError(body.error || "Noget gik galt");
        setPin("");
        if (res.status === 423) setLocked(true);
      } catch {
        setError("Noget gik galt");
        setPin("");
      } finally {
        setBusy(false);
      }
    },
    [picked, busy, locked, locationId, onChanged],
  );

  async function reset() {
    setBusy(true);
    setError("");
    try {
      const res = await posFetch("/api/pos/operator", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Noget gik galt");
        return;
      }
      // Nulstillingen er gennemført; forælderen skal altid genindlæse, også hvis
      // opslaget bagefter fejler (fx 403 fordi adgangen ændrer sig med ekspedienten).
      let data: { current?: Operator; staff?: StaffEntry[] } = {};
      try {
        const after = await posFetch(`/api/pos/operator?location_id=${locationId}`, { cache: "no-store" });
        if (after.ok) data = (await after.json()) as typeof data;
      } catch {
        // Falder tilbage til genindlæsning nedenfor.
      }
      if (data.current) {
        setCurrent(data.current);
        setStaff(data.staff ?? []);
        close();
      } else {
        close();
        await load();
      }
      onChanged(data.current ?? null);
    } catch {
      setError("Noget gik galt");
    } finally {
      setBusy(false);
    }
  }

  // Fysisk tastatur: tal, Backspace og Enter, mens pinkoden skal tastes.
  useEffect(() => {
    if (!open || !picked || locked) return;
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        setPin((p) => (p.length < MAX_PIN ? p + e.key : p));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setPin((p) => p.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        void submit(pin);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, picked, locked, pin, submit]);

  if (!current) return null;

  const isOverridden = loggedInId !== "" ? current.id !== loggedInId : false;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center rounded-lg border border-[#E2E5E0] bg-[#F5F6F4] px-3 text-sm font-semibold text-[#15211B] hover:bg-[#EDEFEB]"
      >
        Ekspedient: {current.name}
      </button>

      {open && (
        <Modal title={picked ? `Pinkode for ${picked.name}` : "Skift ekspedient"} onClose={close}>
          {picked ? (
            <div>
              <div
                role="status"
                aria-label="Pinkode"
                className="mb-3 flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#C9D0C7] bg-[#F5F6F4]"
              >
                {pin.length === 0 ? (
                  <span className="text-sm text-[#5E6A63]">Tast pinkode</span>
                ) : (
                  Array.from(pin).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-[#1A3D2E]" aria-hidden />)
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={keyClass}
                    disabled={locked || busy}
                    onClick={() => setPin((p) => (p.length < MAX_PIN ? p + k : p))}
                  >
                    {k}
                  </button>
                ))}
                <button type="button" className={keyClass} disabled={locked || busy} onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Slet ciffer">
                  Slet
                </button>
                <button
                  type="button"
                  className={keyClass}
                  disabled={locked || busy}
                  onClick={() => setPin((p) => (p.length < MAX_PIN ? p + "0" : p))}
                >
                  0
                </button>
                <button
                  type="button"
                  className="h-14 rounded-[10px] bg-[#1A3D2E] text-base font-semibold text-white hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={locked || busy || pin.length < 4}
                  onClick={() => void submit(pin)}
                >
                  OK
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button type="button" className={`${btnSecondary} mt-4 w-full`} onClick={() => {
                  setPicked(null);
                  setPin("");
                  setError("");
                  setLocked(false);
                }}>
                VÃ¦lg en anden
              </button>
            </div>
          ) : (
            <div>
              <ul className="grid gap-2">
                {staff.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!s.hasPin}
                      onClick={() => pickStaff(s)}
                      className="flex h-12 w-full items-center justify-between rounded-[10px] border border-[#C9D0C7] bg-white px-4 text-left text-[15px] font-semibold text-[#15211B] hover:bg-[#F5F6F4] disabled:cursor-not-allowed disabled:bg-[#F5F6F4] disabled:text-[#8A948D]"
                    >
                      <span>{s.name}</span>
                      {!s.hasPin && <span className="text-xs font-normal">Ingen pinkode</span>}
                    </button>
                  </li>
                ))}
              </ul>
              {error && (
                <p role="alert" className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              {isOverridden && (
                <button type="button" className={`${btnSecondary} mt-4 w-full`} disabled={busy} onClick={() => void reset()}>
                  {loggedInName ? `Tilbage til ${loggedInName}` : "Tilbage"}
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
