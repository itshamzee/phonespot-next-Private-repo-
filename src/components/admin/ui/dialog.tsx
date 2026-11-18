"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DialogHTMLAttributes,
  type ReactNode,
} from "react";
import { MOTION_MS } from "./motion";

/**
 * Fælles dialog til admin på det native <dialog> med showModal(): resten af siden er
 * inert (fokusfælde), og dialogen ligger øverst. Fokus går til elementet med autoFocus
 * eller det første fokuserbare, og tilbage til det, der havde fokus før, når den lukker.
 * initialFocus="container" lægger fokus på selve dialogen i stedet for den første knap
 * (kassen: en scanners Enter må ikke trykke på noget), og restoreFocus={false} lader
 * fokus være, når den lukker (kassen lægger det selv i scanfeltet).
 *
 * Esc og klik på baggrunden kalder onClose, medmindre dismissable={false};
 * dismissOnBackdrop={false} slår kun baggrundsklikket fra (fx når der er tastet tekst). Esc fanges
 * på keydown (som kassens gamle Modal), så browserens egen lukning aldrig når at lukke
 * dialogen bag om React; lukker browseren den alligevel, åbnes den igen, hvis den stadig
 * skal være åben. Kun den øverste åbne dialog reagerer på Esc.
 *
 * Udseende: 12 px hjørner, 1 px kant, ingen skygge, baggrund rgba(21,33,27,.35) uden blur.
 * Bevægelsen er .m-dialog i app/admin-motion.css (ind på --dur-base, ud på --dur-fast).
 * Indholdet monteres først, når dialogen er åben (så autoFocus virker), og bliver
 * stående, mens den toner ud.
 */

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "max-w-[448px]",
  md: "max-w-[520px]",
  lg: "max-w-[576px]",
};

/** --dur-fast: tid til at tone ud, før indholdet afmonteres. */
const EXIT_MS = MOTION_MS.fast;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Åbne dialoger i rækkefølge; den sidste er øverst. */
const openStack: symbol[] = [];

function show(el: HTMLDialogElement) {
  if (typeof el.showModal === "function") {
    if (!el.open) el.showModal();
  } else {
    // jsdom og meget gamle browsere: ingen showModal.
    el.setAttribute("open", "");
  }
}

function hide(el: HTMLDialogElement) {
  if (typeof el.close === "function") {
    if (el.open) el.close();
  } else {
    el.removeAttribute("open");
  }
}

function focusBack(previous: HTMLElement | null) {
  if (previous && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
}

/** Fokus ved åbning: selve dialogen eller dens første fokuserbare element. */
function focusInitial(el: HTMLDialogElement, initialFocus: "first" | "container") {
  if (initialFocus === "container") el.focus({ preventScroll: true });
  else el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
}

export interface DialogProps
  extends Omit<
    DialogHTMLAttributes<HTMLDialogElement>,
    // Lukning, fokus og baggrund styres af Dialog selv og kan ikke overskrives udefra.
    "open" | "onClose" | "onCancel" | "onMouseDown" | "tabIndex" | "title" | "children"
  > {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: Size;
  /** false: Esc, baggrund og lukkeknap lukker ikke (fx midt i en betaling). */
  dismissable?: boolean;
  /** false: klik på baggrunden lukker ikke (Esc og lukkeknap gør stadig). Standard true. */
  dismissOnBackdrop?: boolean;
  /** false: fokus lægges ikke tilbage, når dialogen lukker. Standard true. */
  restoreFocus?: boolean;
  /**
   * Fokus ved åbning, når intet felt har autoFocus: "first" (standard) = første fokuserbare,
   * "container" = selve dialogen, så ingen knap har fokus.
   */
  initialFocus?: "first" | "container";
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
  dismissOnBackdrop = true,
  restoreFocus = true,
  initialFocus = "first",
  className = "",
  ...rest
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const [mounted, setMounted] = useState(false);

  // Nyeste værdier til lyttere, der lever længere end én render.
  const onCloseRef = useRef(onClose);
  const dismissableRef = useRef(dismissable);
  const backdropRef = useRef(dismissOnBackdrop);
  const restoreRef = useRef(restoreFocus);
  const initialRef = useRef(initialFocus);
  const openRef = useRef(open);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    dismissableRef.current = dismissable;
    backdropRef.current = dismissOnBackdrop;
    restoreRef.current = restoreFocus;
    initialRef.current = initialFocus;
    openRef.current = open;
  });

  // Det element, der havde fokus, før dialogen åbnede.
  const previousRef = useRef<HTMLElement | null>(null);

  // Åbn/luk. Oprydningen lukker og giver fokus tilbage, også når dialogen afmonteres.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousRef.current = previous;
    const token = Symbol("dialog");
    openStack.push(token);
    show(el);
    // Genåbnet, mens indholdet stadig stod (under udtoningen): fokus ind med det samme.
    if (el.firstElementChild && !el.contains(document.activeElement)) focusInitial(el, initialRef.current);
    setMounted(true);

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.isComposing || e.defaultPrevented) return;
      if (openStack[openStack.length - 1] !== token) return;
      e.preventDefault();
      if (dismissableRef.current) onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = openStack.indexOf(token);
      if (i >= 0) openStack.splice(i, 1);
      hide(el);
      if (restoreRef.current) focusBack(previous);
    };
  }, [open]);

  // Lukket, men stadig monteret: React lægger efter en commit fokus tilbage på det element,
  // der havde det (fx et felt i dialogen, der toner ud). Derfor også her, efter React.
  useLayoutEffect(() => {
    if (open || !previousRef.current) return;
    if (restoreRef.current) focusBack(previousRef.current);
    previousRef.current = null;
  }, [open]);

  // Indholdet er monteret: har intet taget fokus (autoFocus), får det første fokuserbare
  // eller selve dialogen det (initialFocus).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !mounted || !el) return;
    if (el.contains(document.activeElement)) return;
    focusInitial(el, initialRef.current);
    // Kun ved åbning; senere fokusskift inde i dialogen er brugerens egne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Indholdet bliver stående, mens dialogen toner ud.
  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  return (
    <dialog
      // Først: Dialogs egne attributter og handlere nedenfor kan ikke overskrives af en kalder.
      {...rest}
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      // "container": dialogen selv kan have fokus (ingen ring på selve fladen; knapperne inde i
      // den har deres egen focus-visible-ring).
      tabIndex={initialFocus === "container" ? -1 : undefined}
      onCancel={(e) => {
        // Andre lukkeanmodninger end Esc (fx Androids tilbage-knap).
        e.preventDefault();
        if (dismissableRef.current) onCloseRef.current();
      }}
      onClose={() => {
        // Browseren lukkede selv dialogen: åbn igen, hvis den stadig skal være åben.
        if (!openRef.current) return;
        if (dismissableRef.current) onCloseRef.current();
        setTimeout(() => {
          const el = ref.current;
          if (el && el.isConnected && openRef.current && !el.open) show(el);
        }, 0);
      }}
      onMouseDown={(e) => {
        // Kun selve baggrunden (indholdet fylder hele <dialog>-elementet).
        if (e.target === e.currentTarget && dismissableRef.current && backdropRef.current) onCloseRef.current();
      }}
      className={`m-dialog m-auto w-[calc(100vw-32px)] rounded-xl border border-[#E2E5E0] bg-white p-0 text-[#15211B] outline-none ${sizes[size]} ${className}`}
    >
      {mounted && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-[#E2E5E0] px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[18px] font-semibold tracking-[-0.01em]">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[13px] text-[#5E6A63]">
                  {description}
                </p>
              )}
            </div>
            {dismissable && (
              <button
                type="button"
                onClick={() => onCloseRef.current()}
                aria-label="Luk"
                className="m-press m-tap -mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5E6A63] hover:bg-[#F5F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3D2E]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E2E5E0] px-5 py-3">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
