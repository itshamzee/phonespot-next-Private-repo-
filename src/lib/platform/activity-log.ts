// src/lib/platform/activity-log.ts
// Shared utility to insert activity log entries

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "device_intake"
  | "device_update"
  | "device_delete"
  | "device_import"
  | "transfer"
  | "price_change"
  | "sku_create"
  | "sku_update"
  | "sku_delete"
  | "stock_adjust"
  | "afregningsbilag_generated";

export interface LogActivityParams {
  supabase: SupabaseClient;
  actorId: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

export async function logActivity({
  supabase,
  actorId,
  action,
  entityType,
  entityId,
  details,
}: LogActivityParams): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? {},
  });

  if (error) {
    console.error("Failed to log activity:", error.message);
    // Activity log failures should not break the main operation
  }
}
