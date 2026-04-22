import Image from "next/image";

const items = [
  { title: "HD klarhed",      desc: "Usynligt som ingenting — ingen farve-tab, ingen rainbow-effekt.",         img: "/spot/clarity.png" },
  { title: "Privacy-filter",  desc: "Din skærm er kun synlig for dig. Perfekt til toget eller caféen.",      img: "/spot/privacy.png" },
  { title: "9H hærdet",       desc: "Samme hårdhed som safirglas — skrabes ikke af nøgler eller mønter.",   img: "/spot/features.png" },
  { title: "Tynd men stærk",  desc: "Bare 0.33mm glas i fire avancerede lag der tilsammen beskytter.",       img: "/spot/crosssection.png" },
];

export function QualityStrip() {
  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl md:text-3xl font-semibold mb-10 text-center">Kvalitet der holder</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(it => (
            <div key={it.title} className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="aspect-video relative bg-white">
                <Image src={it.img} alt={it.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold mb-2">{it.title}</h3>
                <p className="text-sm text-gray-600">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
