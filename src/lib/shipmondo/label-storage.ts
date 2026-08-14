/**
 * Where booked shipping labels live: the private `shipping-labels` bucket,
 * addressed by order number so no extra DB column is needed. Written by
 * POST /api/shipping/labels, read by the staff-gated
 * GET /api/admin/shipping/label.
 */

export const LABEL_BUCKET = "shipping-labels";

export function labelStoragePath(orderNumber: string): string {
  return `orders/${orderNumber}.pdf`;
}
