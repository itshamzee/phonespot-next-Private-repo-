/**
 * Det sagsnummer, mennesker ser og siger højt: ticket_number (PS-2026-0001,
 * sat af en DB-trigger). Ældre rækker eller en manglende kolonne falder
 * tilbage til de første 8 tegn af uuid'et, så der altid er noget at vise.
 */
export function ticketLabel(ticket: { id: string; ticket_number?: string | null }): string {
  const number = ticket.ticket_number?.trim();
  return number ? number : ticket.id.slice(0, 8);
}
