# Multi-Device Booking

**Status:** Planned — not yet designed or implemented.

**Idea:** Allow customers to book repairs for multiple devices in a single booking session. For example, a customer brings in an iPhone with a cracked screen AND an iPad with a battery issue — one booking, one payment.

## Current limitation

The BookingWizard (`src/components/repair/booking-wizard.tsx`) is built around a single device: one brand, one model, services for that model. The flow is linear: Enhed -> Reparation -> Detaljer -> Dato -> Betal.

## Rough approach

- After selecting services for device 1, offer "Tilfoej endnu en enhed" button
- Loop: brand -> model -> services per device
- Shared customer info, date, and payment across all devices
- Summary shows all devices with their services
- Single Shopify Draft Order with line items from all devices
- Single repair ticket per device in Supabase, linked by a shared booking ID

## Open questions

- Should each device get its own repair ticket, or one ticket with multiple devices?
- How to handle different drop-off dates per device?
- Discount logic: does multi-service discount apply across devices or per device?

## When ready

Use the brainstorming skill to fully design this before implementation.
