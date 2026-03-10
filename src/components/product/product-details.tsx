import type { Product } from "@/lib/shopify/types";

/* ------------------------------------------------------------------ */
/*  Product-specific data                                              */
/* ------------------------------------------------------------------ */

type ProductSpecs = {
  /** Short marketing intro (2-3 sentences) */
  intro: string;
  /** 4 icon highlights shown as cards */
  highlights: { icon: string; title: string; detail: string }[];
  /** Full spec table grouped by category */
  specs: { label: string; value: string }[];
};

/** Map product title keywords → specific chip names */
function getAppleWatchChip(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ultra 2")) return "Apple S9 SiP";
  if (t.includes("ultra")) return "Apple S8 SiP";
  if (t.includes("series 10") || t.includes("series 9")) return "Apple S9 SiP";
  if (t.includes("series 8")) return "Apple S8 SiP";
  if (t.includes("series 7")) return "Apple S7 SiP";
  if (t.includes("series 6")) return "Apple S6 SiP";
  if (t.includes("se") && t.includes("2")) return "Apple S8 SiP";
  if (t.includes("se")) return "Apple S5 SiP";
  return "Apple S-serie SiP";
}

function getAppleWatchWaterRating(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ultra")) return "WR100 (100m) + EN13319";
  if (t.includes("se")) return "WR50 (50m)";
  return "WR50 (50m) / IP6X";
}

function getAppleWatchDisplay(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("ultra")) return "OLED LTPO Always-On Retina, 2000 nits";
  if (t.includes("series 10") || t.includes("series 9")) return "OLED LTPO Always-On Retina, 2000 nits";
  if (t.includes("series 8") || t.includes("series 7")) return "OLED LTPO Always-On Retina, 1000 nits";
  if (t.includes("se")) return "OLED Retina LTPO";
  return "OLED Retina (Always-On)";
}

function getIPhoneChip(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("16 pro") || t.includes("16 plus")) return "Apple A18 Pro";
  if (t.includes("16")) return "Apple A18";
  if (t.includes("15 pro")) return "Apple A17 Pro";
  if (t.includes("15")) return "Apple A16 Bionic";
  if (t.includes("14 pro")) return "Apple A16 Bionic";
  if (t.includes("14")) return "Apple A15 Bionic";
  if (t.includes("13 pro")) return "Apple A15 Bionic";
  if (t.includes("13")) return "Apple A15 Bionic";
  if (t.includes("12 pro")) return "Apple A14 Bionic";
  if (t.includes("12")) return "Apple A14 Bionic";
  if (t.includes("11 pro")) return "Apple A13 Bionic";
  if (t.includes("11")) return "Apple A13 Bionic";
  return "Apple A-serie Bionic";
}

function getIPhoneCamera(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("16 pro")) return "48 MP + 48 MP ultra + 12 MP tele (5×)";
  if (t.includes("15 pro max")) return "48 MP + 12 MP ultra + 12 MP tele (5×)";
  if (t.includes("15 pro")) return "48 MP + 12 MP ultra + 12 MP tele (3×)";
  if (t.includes("15 plus") || t.includes("15\"")) return "48 MP + 12 MP ultra";
  if (t.includes("14 pro")) return "48 MP + 12 MP ultra + 12 MP tele (3×)";
  if (t.includes("13 pro")) return "12 MP + 12 MP ultra + 12 MP tele (3×)";
  if (t.includes("pro")) return "Triple kamera, LiDAR";
  return "Dual kamera-system";
}

/* ------------------------------------------------------------------ */
/*  Generate specs per product type                                    */
/* ------------------------------------------------------------------ */

function getProductData(product: Product): ProductSpecs {
  const title = product.title;
  const t = title.toLowerCase();

  // ---- Apple Watch ----
  if (t.includes("watch")) {
    const chip = getAppleWatchChip(title);
    const water = getAppleWatchWaterRating(title);
    const display = getAppleWatchDisplay(title);
    const isUltra = t.includes("ultra");
    const isSE = t.includes("se");

    return {
      intro: isUltra
        ? `${title} er designet til eventyr og ekstrem udholdenhed. Med det mest robuste Apple Watch-design, ${chip} processor, præcis dual-frekvens GPS og op til 36 timers batteritid er dette det ultimative ur til atleter og udendørs entusiaster.`
        : isSE
        ? `${title} giver dig de vigtigste Apple Watch-funktioner til en attraktiv pris. Med ${chip} processor, sundhedssensorer og sømløs integration med din iPhone er det den smarteste vej ind i Apple Watch-universet.`
        : `${title} kombinerer banebrydende sundhedsteknologi med et elegant design. Med ${chip} processor, Always-On Retina-display og avancerede sensorer får du et kraftfuldt værktøj på håndleddet — til sundhed, fitness og hverdagen.`,
      highlights: [
        {
          icon: "cpu",
          title: chip,
          detail: "Hurtig og energieffektiv",
        },
        {
          icon: "display",
          title: display.split(",")[0],
          detail: isUltra ? "Op til 2000 nits" : isSE ? "Retina touch" : "Always-On",
        },
        {
          icon: "water",
          title: water.split(" ")[0],
          detail: "Vandtæt",
        },
        {
          icon: "battery",
          title: isUltra ? "Op til 36 timer" : "Op til 18 timer",
          detail: "Batteritid",
        },
      ],
      specs: [
        { label: "Processor", value: chip },
        { label: "Display", value: display },
        { label: "Sensorer", value: isUltra ? "Puls, SpO2, temperatur, dybdemåler, kompas" : isSE ? "Puls, accelerometer, gyroskop" : "Puls, SpO2, temperatur, accelerometer, gyroskop" },
        { label: "Vandtæthed", value: water },
        { label: "Batteri", value: isUltra ? "Op til 36 timer (72 t. i strømsparetilstand)" : "Op til 18 timer (36 t. i strømsparetilstand)" },
        { label: "Forbindelse", value: "Wi-Fi, Bluetooth 5.3, GPS" + (isUltra ? ", dual-frekvens L1/L5" : "") },
        { label: "Operativsystem", value: "watchOS (seneste understøttede)" },
        { label: "Materiale", value: isUltra ? "Titan, safirkrystal" : isSE ? "Aluminium, Ion-X glas" : "Aluminium / rustfrit stål" },
        { label: "Størrelse", value: "Se variantvælger" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- iPhone ----
  if (t.includes("iphone")) {
    const chip = getIPhoneChip(title);
    const camera = getIPhoneCamera(title);
    const isPro = t.includes("pro");

    return {
      intro: isPro
        ? `${title} sætter en ny standard for smartphone-ydeevne med ${chip}-chippen og det mest avancerede kamerasystem i en iPhone. Pro-graden titankonstruktion, Always-On display og hele dagens batteritid gør den til det professionelle valg.`
        : `${title} leverer imponerende ydeevne med ${chip}-chippen, et fremragende kamerasystem og lang batteritid. Det perfekte valg til dig der vil have premium Apple-kvalitet til en fornuftig pris.`,
      highlights: [
        { icon: "cpu", title: chip, detail: "Toppræstation" },
        { icon: "camera", title: isPro ? "Pro kamera" : "Dual kamera", detail: camera.split("+")[0].trim() },
        { icon: "display", title: isPro ? "Super Retina XDR" : "Super Retina", detail: isPro ? "Always-On, ProMotion" : "OLED HDR" },
        { icon: "battery", title: "Hele dagen", detail: "Batteritid" },
      ],
      specs: [
        { label: "Processor", value: chip },
        { label: "Display", value: isPro ? "Super Retina XDR OLED, ProMotion 120 Hz, Always-On" : "Super Retina XDR OLED, 60 Hz" },
        { label: "Kamera (bag)", value: camera },
        { label: "Kamera (front)", value: isPro ? "12 MP TrueDepth, Face ID" : "12 MP TrueDepth, Face ID" },
        { label: "Lagerplads", value: "Se variantvælger" },
        { label: "Batteri", value: "Li-Ion, hurtigopladning (50% på 30 min.), MagSafe" },
        { label: "Forbindelse", value: "5G, Wi-Fi 6/6E, Bluetooth 5.3, NFC, UWB" },
        { label: "Vandtæthed", value: isPro ? "IP68 (6 meter, 30 min.)" : "IP68 (6 meter, 30 min.)" },
        { label: "Materiale", value: isPro ? "Titan, Ceramic Shield" : "Aluminium, Ceramic Shield" },
        { label: "Operativsystem", value: "iOS (seneste understøttede)" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- iPad ----
  if (t.includes("ipad")) {
    const isPro = t.includes("pro");
    const isAir = t.includes("air");
    const isMini = t.includes("mini");

    return {
      intro: isPro
        ? `${title} er det ultimative kreative værktøj. Med M-serie chip, Liquid Retina XDR-display og Apple Pencil Pro-understøttelse erstatter den nemt en bærbar — til video, design og multitasking.`
        : isAir
        ? `${title} kombinerer tynd og let konstruktion med kraftig M-serie ydeevne. Perfekt til studier, underholdning og produktivitet — med understøttelse af Apple Pencil og Magic Keyboard.`
        : isMini
        ? `${title} pakker fuld iPad-kraft ind i det mest kompakte format. Perfekt til noter, læsning og produktivitet på farten.`
        : `${title} leverer alt hvad du har brug for i en tablet — et flot display, lang batteritid og adgang til hele iPad-app-økosystemet.`,
      highlights: [
        { icon: "cpu", title: isPro ? "M-serie chip" : isAir ? "M-serie chip" : "A-serie chip", detail: "Desktop-kraft" },
        { icon: "display", title: isPro ? "Liquid Retina XDR" : "Liquid Retina", detail: isPro ? "ProMotion 120 Hz" : "True Tone" },
        { icon: "pencil", title: "Apple Pencil", detail: isPro ? "Pro-understøttelse" : "Understøttet" },
        { icon: "battery", title: "Op til 10 timer", detail: "Batteritid" },
      ],
      specs: [
        { label: "Processor", value: isPro ? "Apple M-serie chip" : isAir ? "Apple M-serie chip" : "Apple A-serie chip" },
        { label: "Display", value: isPro ? "Liquid Retina XDR, ProMotion 120 Hz, True Tone" : "Liquid Retina, True Tone" },
        { label: "Kamera (bag)", value: isPro ? "12 MP vidvinkel + 10 MP ultra, LiDAR" : "12 MP vidvinkel" },
        { label: "Kamera (front)", value: "12 MP ultravid, Center Stage" },
        { label: "Lagerplads", value: "Se variantvælger" },
        { label: "Batteri", value: "Li-Po, op til 10 timers brug" },
        { label: "Forbindelse", value: "Wi-Fi 6/6E, Bluetooth 5.3" },
        { label: "Tilbehør", value: isPro ? "Apple Pencil Pro, Magic Keyboard" : "Apple Pencil, Smart Keyboard" },
        { label: "Operativsystem", value: "iPadOS (seneste understøttede)" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- Samsung / Galaxy ----
  if (t.includes("samsung") || t.includes("galaxy")) {
    const isUltra = t.includes("ultra");
    const isFold = t.includes("fold");
    const isFlip = t.includes("flip");

    return {
      intro: isFold || isFlip
        ? `${title} redefinerer smartphones med sit innovative foldbare design. Udfoldet får du en tablet-lignende oplevelse, og sammenfoldet en kompakt telefon — alt sammen med Samsungs topklasse hardware.`
        : isUltra
        ? `${title} er Samsungs absolutte flagskib med det mest avancerede kamerasystem, S Pen-integration og en kæmpe Dynamic AMOLED-skærm. Bygget til dem der kræver det bedste.`
        : `${title} kombinerer Samsung-kvalitet med et skarpt AMOLED-display, kraftig processor og et alsidigt kamerasystem. En solid daglig driver til en fornuftig pris.`,
      highlights: [
        { icon: "cpu", title: "Snapdragon / Exynos", detail: "Flagskibsprocessor" },
        { icon: "display", title: "Dynamic AMOLED 2X", detail: isUltra ? "120 Hz, 3120×1440" : "120 Hz adapativ" },
        { icon: "camera", title: isUltra ? "200 MP kamera" : "Multi-kamera", detail: isUltra ? "10× optisk zoom" : "AI-forbedret" },
        { icon: "battery", title: isUltra ? "5000 mAh" : "4500+ mAh", detail: "Hurtigopladning 45W" },
      ],
      specs: [
        { label: "Processor", value: "Qualcomm Snapdragon / Samsung Exynos" },
        { label: "Display", value: isUltra ? "Dynamic AMOLED 2X, 120 Hz, QHD+" : "Dynamic AMOLED 2X, 120 Hz, FHD+" },
        { label: "Kamera (bag)", value: isUltra ? "200 MP + 12 MP ultra + 50 MP tele (5×) + 10 MP tele (3×)" : "50 MP + 12 MP ultra + 10 MP tele" },
        { label: "Kamera (front)", value: "12 MP" },
        { label: "Lagerplads", value: "Se variantvælger" },
        { label: "Batteri", value: isUltra ? "5000 mAh, 45W hurtigopladning, trådløs" : "4500+ mAh, 25W hurtigopladning" },
        { label: "Forbindelse", value: "5G, Wi-Fi 6E, Bluetooth 5.3, NFC" },
        { label: "Vandtæthed", value: "IP68" },
        { label: "Operativsystem", value: "Android (seneste understøttede)" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- MacBook ----
  if (t.includes("macbook") || t.includes("mac")) {
    const isPro = t.includes("pro");
    const isAir = t.includes("air");

    return {
      intro: isPro
        ? `${title} er den bærbare til professionelle. Med Apple M-serie chip, et fantastisk Liquid Retina XDR-display og op til 22 timers batteritid håndterer den alt fra videoredigering til softwareudvikling — uden at blinke.`
        : `${title} er den perfekte bærbare til studier, arbejde og kreativitet. Utrolig tynd og let, med Apple-silicium der leverer fantastisk ydeevne og hele dagen lang batteritid.`,
      highlights: [
        { icon: "cpu", title: "Apple M-serie", detail: "Op til 12-core CPU" },
        { icon: "display", title: isPro ? "Liquid Retina XDR" : "Liquid Retina", detail: isPro ? "ProMotion 120 Hz" : "True Tone, P3" },
        { icon: "battery", title: isPro ? "Op til 22 timer" : "Op til 18 timer", detail: "Batteritid" },
        { icon: "keyboard", title: "Magic Keyboard", detail: "Baggrundsbelyst, dansk" },
      ],
      specs: [
        { label: "Processor", value: "Apple M-serie chip" },
        { label: "Display", value: isPro ? "Liquid Retina XDR, ProMotion 120 Hz, True Tone" : "Liquid Retina, True Tone, P3" },
        { label: "Displaystørrelse", value: isPro ? "14\" / 16\"" : isAir ? "13,6\" / 15,3\"" : "13,3\" / 15\"" },
        { label: "RAM", value: "Se variantvælger" },
        { label: "Lagerplads", value: "SSD — se variantvælger" },
        { label: "Grafik", value: "Integreret Apple GPU (op til 38-core)" },
        { label: "Porte", value: isPro ? "HDMI, SDXC, MagSafe, 3× Thunderbolt" : "2× Thunderbolt / USB 4, MagSafe" },
        { label: "Trådløs", value: "Wi-Fi 6E, Bluetooth 5.3" },
        { label: "Batteri", value: isPro ? "Li-Po, op til 22 timers brug" : "Li-Po, op til 18 timers brug" },
        { label: "Vægt", value: isPro ? "Ca. 1,55 - 2,14 kg" : isAir ? "Ca. 1,24 - 1,51 kg" : "Ca. 1,4 kg" },
        { label: "Operativsystem", value: "macOS (seneste understøttede)" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- Lenovo ThinkPad ----
  if (t.includes("thinkpad") || t.includes("lenovo")) {
    return {
      intro: `${title} er bygget til erhvervslivet. Med den ikoniske ThinkPad-kvalitet, MIL-STD-810G holdbarhed, fremragende tastatur og virksomhedssikkerhed er det den pålidelige partner til professionelt arbejde — dag efter dag.`,
      highlights: [
        { icon: "cpu", title: "Intel Core", detail: "i5 / i7 processor" },
        { icon: "display", title: "IPS Full HD", detail: "Anti-glare, lav blåt lys" },
        { icon: "security", title: "Virksomhedssikkerhed", detail: "Fingeraftryk + TPM 2.0" },
        { icon: "durability", title: "MIL-STD-810G", detail: "Militær holdbarhed" },
      ],
      specs: [
        { label: "Processor", value: "Intel Core i5 / i7" },
        { label: "Display", value: "IPS Full HD (1920×1080), anti-glare" },
        { label: "Displaystørrelse", value: "14\" / 15,6\"" },
        { label: "Grafik", value: "Intel UHD / Iris Xe Graphics" },
        { label: "RAM", value: "Se variantvælger" },
        { label: "Lagerplads", value: "SSD — se variantvælger" },
        { label: "Porte", value: "USB-A, USB-C / Thunderbolt, HDMI, Ethernet" },
        { label: "Trådløs", value: "Wi-Fi 6, Bluetooth 5.x" },
        { label: "Batteri", value: "Li-Ion, op til 10 timers brug" },
        { label: "Sikkerhed", value: "Fingeraftrykslæser, TPM 2.0, dTPM" },
        { label: "Tastatur", value: "ThinkPad-tastatur, baggrundsbelyst" },
        { label: "Holdbarhed", value: "MIL-STD-810G testet (12 metoder)" },
        { label: "Operativsystem", value: "Windows 11 Pro (ren installation)" },
        { label: "Vægt", value: "Ca. 1,4 - 1,9 kg" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- HP EliteBook / ProBook ----
  if (t.includes("elitebook") || t.includes("hp") || t.includes("probook")) {
    return {
      intro: `${title} er designet til det moderne kontor. HP Sure Start selvhelbredende BIOS, B&O-lyd og et holdbart aluminiumschassis gør den til et pålideligt valg for virksomheder og professionelle brugere.`,
      highlights: [
        { icon: "cpu", title: "Intel Core", detail: "i5 / i7 processor" },
        { icon: "display", title: "IPS Full HD", detail: "Sure View (udvalgte)" },
        { icon: "audio", title: "Bang & Olufsen", detail: "Premium lyd" },
        { icon: "security", title: "HP Sure Start", detail: "Selvhelbredende BIOS" },
      ],
      specs: [
        { label: "Processor", value: "Intel Core i5 / i7" },
        { label: "Display", value: "IPS Full HD (1920×1080)" },
        { label: "Displaystørrelse", value: "14\" / 15,6\"" },
        { label: "Grafik", value: "Intel UHD / Iris Xe Graphics" },
        { label: "RAM", value: "Se variantvælger" },
        { label: "Lagerplads", value: "SSD — se variantvælger" },
        { label: "Porte", value: "USB-A, USB-C / Thunderbolt, HDMI, DisplayPort" },
        { label: "Trådløs", value: "Wi-Fi 6, Bluetooth 5.x" },
        { label: "Batteri", value: "Li-Ion, op til 8 timers brug" },
        { label: "Lyd", value: "Bang & Olufsen højttalere" },
        { label: "Sikkerhed", value: "Fingeraftrykslæser, IR-kamera, HP Sure Start" },
        { label: "Operativsystem", value: "Windows 11 Pro (ren installation)" },
        { label: "Vægt", value: "Ca. 1,3 - 1,8 kg" },
        { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
      ],
    };
  }

  // ---- Generic fallback ----
  return {
    intro: `${title} er grundigt testet og kvalitetssikret af vores teknikere. Enheden leveres med 36 måneders garanti og er klar til brug fra dag ét.`,
    highlights: [
      { icon: "check", title: "30-punkt test", detail: "Kvalitetssikret" },
      { icon: "shield", title: "36 mdr. garanti", detail: "Fuld dækning" },
      { icon: "truck", title: "1-2 dage", detail: "Hurtig levering" },
      { icon: "return", title: "14 dage", detail: "Fuld returret" },
    ],
    specs: [
      { label: "Type", value: product.productType || "Elektronik" },
      { label: "Stand", value: "Testet & kvalitetssikret" },
      { label: "Garanti", value: "36 måneders PhoneSpot-garanti" },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Highlight icon SVGs                                                */
/* ------------------------------------------------------------------ */

function HighlightIcon({ type }: { type: string }) {
  const cls = "h-6 w-6 text-green-eco";

  switch (type) {
    case "cpu":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
        </svg>
      );
    case "display":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
        </svg>
      );
    case "camera":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>
      );
    case "battery":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18Z" />
        </svg>
      );
    case "water":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c-2.004 3.503-6 7.584-6 11.25a6 6 0 0 0 12 0c0-3.666-3.996-7.747-6-11.25Z" />
        </svg>
      );
    case "pencil":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
        </svg>
      );
    case "keyboard":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM7.5 8.25h.008v.008H7.5V8.25Zm3 0h.008v.008H10.5V8.25Zm3 0h.008v.008H13.5V8.25Zm3 0h.008v.008H16.5V8.25Zm-9 3h.008v.008H7.5v-.008Zm3 0h.008v.008H10.5v-.008Zm3 0h.008v.008H13.5v-.008Zm3 0h.008v.008H16.5v-.008Zm-7.5 3h6v.008h-6v-.008Z" />
        </svg>
      );
    case "security":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33" />
        </svg>
      );
    case "durability":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      );
    case "audio":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cls}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Exported component                                                 */
/* ------------------------------------------------------------------ */

export function ProductDetails({ product }: { product: Product }) {
  const data = getProductData(product);

  return (
    <div className="mx-auto max-w-4xl">
      {/* ---- Intro paragraph ---- */}
      <p className="mb-8 text-base leading-relaxed text-charcoal/80 md:text-lg md:leading-relaxed">
        {data.intro}
      </p>

      {/* ---- Highlight cards ---- */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {data.highlights.map((h) => (
          <div
            key={h.title}
            className="flex flex-col items-center gap-2 rounded-2xl border border-sand bg-white px-4 py-5 text-center shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-eco/8">
              <HighlightIcon type={h.icon} />
            </div>
            <span className="font-display text-sm font-bold text-charcoal leading-tight">
              {h.title}
            </span>
            <span className="text-xs text-charcoal/50">{h.detail}</span>
          </div>
        ))}
      </div>

      {/* ---- Spec table ---- */}
      <div className="overflow-hidden rounded-2xl border border-sand bg-white shadow-sm">
        <div className="border-b border-sand bg-sand/30 px-5 py-3.5">
          <h3 className="font-display text-sm font-bold text-charcoal">
            Specifikationer
          </h3>
        </div>
        <table className="w-full text-left text-sm">
          <tbody>
            {data.specs.map((spec, idx) => (
              <tr
                key={spec.label}
                className={`border-b border-sand/60 last:border-b-0 ${
                  idx % 2 === 0 ? "bg-white" : "bg-sand/20"
                }`}
              >
                <td className="w-2/5 px-5 py-3 font-medium text-charcoal">
                  {spec.label}
                </td>
                <td className="px-5 py-3 text-charcoal/70">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Refurbished guarantee note ---- */}
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-green-eco/5 px-5 py-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-green-eco">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-charcoal">PhoneSpot Refurbished-garanti</p>
          <p className="mt-0.5 text-xs leading-relaxed text-charcoal/60">
            Alle specifikationer er verificeret af vores teknikere. Enheden er gennemgået med en 30-punkt kvalitetstest og leveres med 36 måneders fuld garanti.
          </p>
        </div>
      </div>
    </div>
  );
}
