# Status for nattearbejdet

Mandat: implementér ejerens godkendte revision 3 side for side. Ingen merge eller deployment.

Arbejdsmappe: `C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-hero`
Branch: `codex/godkendt-design`, startet fra `origin/main` (`1a2a18b`).
Plan: `docs/superpowers/plans/2026-09-11-godkendt-design.md`.
Godkendt uændret reference: lokal designvisning port 3110 og mappen nævnt i spec.

## Fremdrift

- Task 1: færdig og godkendt i side-review — commits 729c6a2 + 0469fb3. Desktop 1195/1440 og mobil 390/320 kontrolleret.
- Task 2: starter — enhedskategorier, filtre og produktkort. Detaljeret brief findes i planens lokale SDD-mappe.
- Task 3–8: afventer sekventielt.

## Beslutninger

- Ruling: nyt arbejde starter fra origin/main i eksisterende isolerede worktree, på ny branch. Den afviste hero-PR og dens commit genbruges ikke. Risiko ved forkert valg: branchbase kan skulle opdateres, men produktion og oprindeligt arbejde er bevaret.
- Ruling: første leverance er den reelle webshop frem for flere isolerede mockups. Godkendelsen af udtryk og mandat til at fortsætte læses som implementeringsmandat. Risiko ved forkert valg: ændringerne forbliver reviewbare og kan undlades fra merge.
- Ruling: prioriter hovedkunderejser og fælles templates før individuelle blog-/indholdssider. Det giver konsistens uden at masseomskrive godkendt indhold. Risiko ved forkert valg: nogle sider kræver en senere separat visuel gennemgang.

## Kontrol og blokeringer

- AGENTS.md læst; worktree var rent. `.env.local` læses ikke.
- node_modules er eksisterende junction; ingen ny installation nødvendig.
- Local preview må ikke bruge fiktivt lager i produktion. Manglende lokale integrationer rapporteres og testes med isolerede fixtures kun i test-/previewværktøj.
- Afslut med konkrete resultater, PR-link, billeder, tests og ærlig liste over manglende sider. Stop gentagne nattekørsler, når mandatet er fuldført eller morgenrapporten er klar.
- Verifikation Task1: 20 fokuserede tests før review + 10 relevante tests efter oprydning, typecheck og lint bestået; fuldt projektbuild/test følger før PR.
- Inaktiv nyhedsbrevstilmelding fjernet fra public shell/footer: popup loggede kun email, footer pegede på ikkeeksisterende endpoint. Øvrige providers og cookie-/kontakt-/forsikringslinks bevaret.
- Lokal review på3107 bruger isolerede læsebeskyttede testdata på3112; dette er ikke lagerkobling til produktion. Deploykode bruger stadig de eksisterende reelle queries.
- Kontrolbilleder: phonespot-webshop-qa/forside-desktop.png i visualiseringsmappen. Godkendt reference på3110 er uændret.
- Apple-kampagnebilledets offentlige brugsret skal afklares før release.
