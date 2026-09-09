-- Manuel status-override på opkøbs-henvendelser.
--
-- Status på et opkøb er normalt afledt (deriveTradeInStatus) af tilbud,
-- labels, kvitteringer og afvisninger. Men virkeligheden afviger nogle gange
-- fra papirsporet: en kunde afleverer i butikken uden label, en pakke bliver
-- aldrig skannet, et tilbud accepteres mundtligt. manual_status lader admin
-- sætte den faktiske status; NULL betyder "brug den afledte".
alter table contact_inquiries
  add column if not exists manual_status text;

alter table contact_inquiries
  drop constraint if exists contact_inquiries_manual_status_check;

alter table contact_inquiries
  add constraint contact_inquiries_manual_status_check
  check (
    manual_status is null or manual_status in (
      'ny', 'tilbud_sendt', 'accepteret', 'afventer_forsendelse', 'paa_vej',
      'leveret', 'afvist', 'modtaget', 'vurderet', 'betalt', 'lukket'
    )
  );
