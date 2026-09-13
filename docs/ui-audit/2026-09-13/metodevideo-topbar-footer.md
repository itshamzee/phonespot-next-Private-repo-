# Salgsside, afsendelse og footer

Brugerens gennemgang: en forklarende animation i PhoneSpots udtryk, mindre hvidt på salgssiden, separate butikslinks ved telefonnummeret og en mere kompakt footer.

- Bruger bekræftede afsendelse alle ugens dage for varer på eget lager. Topbaren tæller ned til kl. 16 i Europe/Copenhagen. Fra kl. 16 vises afsendelse igen i morgen; ved midnat begynder næste dags nedtælling. Ingen ændringer i fragtberegning eller ordrebehandling.
- 28 sekunders lydløs typografisk metodefilm, produceret med Higgsedit. Fire trin: beskriv enheden, vurdering, kundens valg, aflevering/indsendelse efter aftale. Ingen øjeblikkelig pris, gratis fragt eller bestemt betalingstid loves. Animationen downloades og starter først efter et aktivt klik. Almindelige videokontroller, ingen gentagelse. Alle oplysninger findes også i sidens tekst.
- PhoneHero-referencen: https://phonehero.dk/saelg-din-gamle-mobil-til-os . Egen tekst og egen animation, ingen kopierede figurer eller video.
- Filmens kilde ligger i saelg-metode.higgsedit.jsx. Produceret 960×540, 24 fps, 28,003 sekunder, 1.234.871 bytes. DM Sans er samme fontfamilie som resten af siden.
- Varme baggrundsflader, grøn videosektion og samlet enhedsguide. Eksisterende SEO-tekst, metadata, canonical, FAQ-schema, billeder, interne links og salgsformular er bevaret.
- Footerens juridiske links er samlet nederst, butikker linker til de enkelte sider, og gentagen reparation er fjernet fra produktlisten. Alle tidligere unikke linkmål er bevaret; tilbehør er tilføjet.
- Betalingslogoer fra ActiveMerchant/Shopifys payment_icons: https://github.com/activemerchant/payment_icons/tree/master/app/assets/images/payment_icons . MIT-licens medfølger under public/images/payments/LICENSE. Logoerne bruges kun i footeren; betalingsintegration er ikke ændret.

Kontrol: 37 tests bestået for layout, nedtælling, salgsside/SEO, formular og tilbudssvar. Video afspillet i browseren med verificeret varighed og uden video-fejl. Alle footerbilleder indlæst. Desktop og 390 px mobilvisning gennemgået uden vandret overflow. Produktionsbuild bestået med lokale testdata.

