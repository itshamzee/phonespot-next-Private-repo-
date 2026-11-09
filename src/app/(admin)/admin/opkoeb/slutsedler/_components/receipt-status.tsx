import { Tag } from "@/components/admin/ui";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Kladde",
  confirmed: "Bekræftet",
  paid: "Udbetalt",
  completed: "Afsluttet",
  voided: "Annulleret",
};

const STATUS_TONES: Record<string, "neutral" | "green" | "amber" | "red"> = {
  draft: "neutral",
  confirmed: "amber",
  paid: "green",
  completed: "green",
  voided: "red",
};

export function StatusTag({ status }: { status: string }) {
  return <Tag tone={STATUS_TONES[status] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Tag>;
}

export function SuspicionTag() {
  return <Tag tone="red">Mistanke</Tag>;
}

export const receiptHref = (id: string) => `/admin/opkoeb/slutsedler/${id}`;
export const draftHref = (id: string) => `/admin/opkoeb/slutsedler/ny?kladde=${id}`;

export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}
