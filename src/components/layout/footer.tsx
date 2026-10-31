import Image from "next/image";
import Link from "next/link";
import { STORES, COMPANY_EMAIL } from "@/lib/store-config";
import styles from "./footer.module.css";
import { CookieSettingsButton } from "@/components/consent/cookie-settings-button";

const PRODUCT_LINKS = [
  { label: "iPhones", href: "/iphones" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "iPads", href: "/ipads" },
  { label: "Bærbare", href: "/baerbare" },
  { label: "Smartwatches", href: "/smartwatches" },
  { label: "Tilbehør", href: "/tilbehoer" },
] as const;

const SERVICE_LINKS = [
  { label: "Sælg din enhed", href: "/saelg-din-enhed" },
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Garanti", href: "/garanti" },
  { label: "Delbetaling", href: "/delbetaling" },
  { label: "Reparation", href: "/reparation" },
  { label: "Reparation Vejle", href: "/reparation-vejle" },
  { label: "Reparation Slagelse", href: "/reparation-slagelse" },
  { label: "Erhverv", href: "/erhverv" },
  { label: "Reklamation", href: "/reklamation" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

const INFO_LINKS = [
  { label: "Om os", href: "/om-os" },
  { label: "FAQ", href: "/faq" },
  { label: "Hvorfor PhoneSpot", href: "/hvorfor-phonespot" },
  { label: "Blog", href: "/blog" },
  { label: "Sammenligninger", href: "/sammenlign" },
] as const;

const LEGAL_LINKS = [
  { label: "Privatlivspolitik", href: "/privatlivspolitik" },
  { label: "Handelsbetingelser", href: "/handelsbetingelser" },
  { label: "Cookies", href: "/cookies" },
] as const;

function TrustpilotLink() {
  return (
    <a
      href="https://dk.trustpilot.com/review/phonespot.dk"
      target="_blank"
      rel="noopener noreferrer"
      className="text-[12px] font-semibold text-white/80 transition-opacity hover:opacity-80"
    >
      Anmeldelser på Trustpilot
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <Link href="/" aria-label="PhoneSpot forside"><Image src="/brand/logos/phonespot-wordmark-white.png" alt="PhoneSpot" width={180} height={35} /></Link>
            <p>Brugt elektronik. Klar til mere.<br />Alle refurbished enheder leveres med 36 måneders garanti.</p>
            <a href={`tel:${STORES.slagelse.phone.replace(/\s/g, "")}`}>{STORES.slagelse.phone}</a>
            <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
            <div className={styles.locations}>
              {[STORES.vejle, STORES.slagelse].map(store => <Link key={store.slug} href={`/butik/${store.slug}`}>{store.city} <span aria-hidden="true">↗</span></Link>)}
              <Link href="/butik/esbjerg">Esbjerg (snart) <span aria-hidden="true">↗</span></Link>
            </div>
            <Link className={styles.storeOverview} href="/butik">Butikker og åbningstider</Link>
          </div>
          {[{ heading: "Produkter", links: PRODUCT_LINKS }, { heading: "Hjælp og service", links: SERVICE_LINKS }, { heading: "Om PhoneSpot", links: INFO_LINKS }].map(group => (
            <nav key={group.heading} aria-label={group.heading} className={styles.navigation}>
              <h2>{group.heading}</h2>
              <ul>{group.links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className={styles.trust}>
          <TrustpilotLink />
          <a href="https://www.emaerket.dk" target="_blank" rel="noopener noreferrer" aria-label="Certificeret af e-mærket"><Image src="/emaerket.png" alt="Certificeret af e-mærket" width={32} height={32} /></a>
          <a href="https://www.pricerunner.dk/vr/303791" target="_blank" rel="nofollow noopener"><Image src="/images/pricerunner-bedoem-os.png" alt="Bedøm os på PriceRunner" width={89} height={45} /></a>
          <a href="https://www.facebook.com/phonespot.dk/" target="_blank" rel="noopener noreferrer" aria-label="PhoneSpot på Facebook" className={styles.facebook}><FacebookIcon /> Facebook</a>
          <Link href="/forsikring" className={styles.partner} aria-label="Elektronikforsikring i samarbejde med Storstrøm Forsikring"><span>I samarbejde med</span><Image src="/brand/partners/storstrom-forsikring-white.svg" alt="Storstrøm Forsikring" width={92} height={27} /></Link>
          <div className={styles.payments} aria-label="Betalingsmuligheder">
            {[['visa','Visa'],['master','Mastercard'],['mobilepay','MobilePay'],['apple_pay','Apple Pay'],['klarna','Klarna']].map(([file,name]) => <Image key={file} src={`/images/payments/${file}.svg`} alt={name} width={42} height={27} />)}
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} PhoneSpot ApS · CVR: 38688766</p>
          <nav aria-label="Vilkår og privatliv">{LEGAL_LINKS.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}<CookieSettingsButton /></nav>
        </div>
      </div>
    </footer>
  );
}
