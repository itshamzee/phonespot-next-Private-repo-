import Image from "next/image";
const items = [
  {title:"Klar eller privacy",desc:"Vælg mellem de varianter, der er tilgængelige til din model. Se glassets egenskaber ved dit valg.",img:"/spot/clarity.png"},
  {title:"Til din model",desc:"Modelvælgeren viser kompatible glas. Kontrollér modelnavnet på din telefon eller tablet, før du bestiller.",img:"/spot/features.png"},
  {title:"Hjælp til montering",desc:"Vi monterer gratis ved køb af beskyttelsesglas hos PhoneSpot i Vejle og Slagelse.",img:"/spot/crosssection.png"},
];
export function QualityStrip() {
  return <section className="border-t border-sand bg-white py-10 font-body">
    <div className="mx-auto max-w-[1280px] px-5 sm:px-9">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Godt at vide om dit glas</h2>
      <div className="grid gap-5 md:grid-cols-3">{items.map(item=><div key={item.title} className="overflow-hidden rounded-xl border border-sand">
        <div className="relative aspect-[3/2] bg-[#f4f5f2]"><Image src={item.img} alt={item.title} fill className="object-contain p-5" sizes="(min-width:768px) 33vw,100vw"/></div>
        <div className="p-5"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-charcoal/65">{item.desc}</p></div>
      </div>)}</div>
    </div>
  </section>;
}
