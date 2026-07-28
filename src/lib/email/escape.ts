// Email templates are built by string interpolation, and much of what goes into
// them is typed by customers: their name, and the free-text brand/model fields
// from the sell-device wizard. Anything from that side gets escaped, so a name
// containing markup cannot rewrite the mail an admin or a customer reads.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
