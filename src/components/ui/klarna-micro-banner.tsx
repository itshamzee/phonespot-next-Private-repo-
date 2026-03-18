export function KlarnaMicroBanner() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-pink-100 bg-pink-50 px-6 py-4">
      {/* Klarna K logo */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFB3C7] text-sm font-black text-[#17120E]">
        K
      </div>
      <p className="text-sm font-medium text-charcoal">
        Del betalingen op med{" "}
        <span className="font-bold text-[#17120E]">Klarna</span> — betal i 3
        rater uden renter
      </p>
    </div>
  );
}
