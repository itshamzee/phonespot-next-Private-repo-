# Reparationssiden – næste side i gennemgangen

Opgave: samme grundighed og udtryk som den gennemgåede salgsside. Kun reparationsforsiden ændres; modelvalg, modeller, priser og booking genbruges.

## Udtryk og indhold

- Mørkegrøn hero med fotografi af en tablet under reparation og direkte genvej til model/pris. Varm hvid baggrund, DM Sans og de eksisterende cremefarver.
- Modelvælger og søgning ligger i én samlet flade. Hjælp til ukendt model er tilgængelig direkte ved vælgeren.
- 28 sekunders egen metodefilm med fire trin: model, booking, aflevering, reparation/afhentning. Samme Higgsedit-udtryk som salgssiden. 960×540, 24 fps, H.264, 1.282.529 bytes. Hentes først efter klik; almindelige kontroller og ingen gentagelse. Metoden står også som tekst.
- Fotografier fra projektets eksisterende bibliotek: tekniker-reparerer.jpg, telefon-med-smadret-skaerm.jpg og butik-indvendig.jpg. Ingen nye eksterne fotos eller syntetiske enhedsbilleder.
- Indhold om skærmskift, batteriskift, ladestik/kamera/lyd, væskeskade, iPhone/Samsung og iPad/MacBook samt længere brug af eksisterende enheder.
- Butiksadresser og links kommer fra store-config. Forsikring henviser fortsat til Storstrøm-flowet.

## SEO og funktioner

Canonical og alle tidligere FAQ-svar bevares. Spørgsmål om reservedele tilføjes både synligt og i FAQ-schema. Brødkrummeskema og delingsbillede tilføjes. LocalBusiness-skemaet henter nu åbningstider fra den fælles konfiguration, inklusive søndag. Teksten lover ikke en bestemt reparationstid eller generel garanti på alle reparationer.

Ingen ændringer i API'er, priser, betalings- eller fragtlogik, database eller bookingkomponenter. Forhåndsvisningen bruger lokale testdata, så viste modeller og priser er ikke et endeligt katalog.

## Kontrol

- 23 tests for reparationsside, modelsøgning, modelside, reparationsoversigt og booking bestået. Tre eksisterende bookingtests ramte først femsekundersgrænsen under parallel belastning; genkørsel med én worker og 15 sekunders grænse bestod. Assertions og bookingkode uændret.
- Browser: model valgt fra søgning, konkret reparation tilføjet, booking vist med den valgte model og pris. Ingen anmodning eller betaling indsendt.
- Mobil 390×844: genvej til modelvælger, brands, sektioner og video kontrolleret; ingen vandret overflow. Filmen afspillet til slut, verificeret varighed 28,003 sekunder, ingen videofejl.
- Produktionsbuild bestået med lokale testdata før lokalt commit.

Filmens redigerbare kilde: reparation-metode.higgsedit.jsx. Renderet med samme DM Sans-registrering som salgssidens film.
