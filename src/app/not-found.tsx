import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-display text-8xl font-black text-[#1A3D2E]/10 md:text-9xl">
          404
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold text-[#111111] md:text-4xl">
          Siden blev ikke fundet
        </h1>
        <p className="mt-4 text-lg text-[#6E6E73]">
          Vi kunne desværre ikke finde den side du leder efter. Måske er den blevet
          flyttet eller fjernet.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#1A3D2E] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-lg"
          >
            Gå til forsiden
          </Link>
          <Link
            href="/iphones"
            className="rounded-full border-2 border-[#E5E5EA] px-8 py-3.5 text-sm font-bold text-[#111111] transition-colors hover:border-[#111111]"
          >
            Se iPhones
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-[#6E6E73]">
          <Link href="/reparation" className="hover:text-[#1A3D2E] hover:underline">
            Reparation
          </Link>
          <Link href="/saelg-din-enhed" className="hover:text-[#1A3D2E] hover:underline">
            Sælg din enhed
          </Link>
          <Link href="/kontakt" className="hover:text-[#1A3D2E] hover:underline">
            Kontakt os
          </Link>
        </div>
      </div>
    </section>
  );
}
