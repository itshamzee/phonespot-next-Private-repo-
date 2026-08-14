-- Record whether an individual unit had its battery replaced, separate from
-- devices.battery_health (the measured capacity). Grade is a cosmetic
-- classification and must never be used to infer a battery fact — battery
-- health and battery replacement are both per-unit measurements/facts that
-- belong on the device row, not derived from grade.
--
-- Nullable boolean: null means "not recorded" (unknown), never "false"/"no".
-- Customer-facing copy must only state "nyt batteri isat" for a unit where
-- this is explicitly true — never inferred from grade, and never defaulted.
--
-- Not backfilled: no existing device row has a verifiable record of whether
-- its battery was replaced, so every row is left null here. Setting it to
-- true or false without a source would be an invented fact, exactly the
-- failure mode this reconciliation exists to remove.

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS battery_replaced boolean;

COMMENT ON COLUMN devices.battery_replaced IS
  'Om enhedens batteri er udskiftet med et nyt, inden salg. Nullable — NULL betyder "ikke registreret" (ukendt), aldrig "nej". Må kun være true når det er bekræftet for netop denne enhed; må ALDRIG udledes af grade.';
