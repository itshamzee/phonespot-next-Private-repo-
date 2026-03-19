import Link from "next/link";

export function CartUpsell() {
  return (
    <div className="border-t border-[#E5E5EA] px-5 py-4 space-y-3">
      <p className="font-display text-xs font-bold tracking-tight text-[#6E6E73]">
        Populære tilvalg
      </p>

      <Link
        href="/tilbehoer"
        className="flex items-center gap-3 rounded-xl border border-[#E5E5EA] bg-[#F7F7F8] p-3 transition-all hover:border-[#1A3D2E]/30 hover:shadow-sm"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A3D2E]/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-[#1A3D2E]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111111]">Beskyt din enhed</p>
          <p className="text-xs text-[#6E6E73]">Covers og panserglas fra 49 kr.</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-auto h-4 w-4 shrink-0 text-[#6E6E73]">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </Link>

      <Link
        href="/reparation"
        className="flex items-center gap-3 rounded-xl border border-[#E5E5EA] bg-white p-3 transition-all hover:border-[#1A3D2E]/30 hover:shadow-sm"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A3D2E]/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-[#1A3D2E]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111111]">Smadret sk&aelig;rm?</p>
          <p className="text-xs text-[#6E6E73]">Vi fikser det p&aring; 30 min.</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="ml-auto h-4 w-4 shrink-0 text-[#6E6E73]">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </Link>

      {/* Free shipping nudge */}
      <div className="rounded-xl bg-[#EFF5F1] p-3 text-center">
        <p className="text-xs font-semibold text-[#1A3D2E]">
          Fri fragt ved k&oslash;b over 500 kr.
        </p>
      </div>
    </div>
  );
}
