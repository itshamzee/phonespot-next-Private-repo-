-- Delstatus pr. enhed (løfte 1, ejerbeslutning 2026-10-29): om skærmen er
-- udskiftet, og om en udskiftet del er original. Supplerer battery_replaced.
--
-- Nullable: NULL betyder "ikke registreret", aldrig "nej". Kundevendt tekst
-- må kun sige "original" eller "skiftet", når feltet er sat for netop den
-- enhed. Ukendte enheder viser "oplyses før køb" i stedet for et gæt.

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS screen_replaced boolean,
  ADD COLUMN IF NOT EXISTS replaced_parts_original boolean;

COMMENT ON COLUMN devices.screen_replaced IS
  'Om enhedens skærm er udskiftet inden salg. NULL = ikke registreret (ukendt), aldrig "nej".';
COMMENT ON COLUMN devices.replaced_parts_original IS
  'Hvis skærm eller batteri er skiftet: true = originale Apple/producent-dele, false = kompatible dele. NULL = ikke registreret eller intet skiftet.';
