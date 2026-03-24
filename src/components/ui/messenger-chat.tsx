"use client";

const FB_PAGE_ID = "phonespot.dk"; // Facebook page username or ID

export function MessengerChat() {
  return (
    <a
      href={`https://m.me/${FB_PAGE_ID}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Skriv til os på Messenger"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#0084FF] px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 print:hidden md:px-5 md:py-3.5"
    >
      {/* Messenger icon */}
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.15.16.14.26.35.27.57l.05 1.78c.02.56.6.93 1.11.71l1.99-.88c.17-.07.36-.09.54-.05.9.25 1.86.38 2.89.38 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm5.89 7.58l-2.88 4.57c-.46.73-1.44.91-2.12.39l-2.29-1.72a.6.6 0 00-.72 0l-3.09 2.34c-.41.31-.95-.18-.68-.62l2.88-4.57c.46-.73 1.44-.91 2.12-.39l2.29 1.72a.6.6 0 00.72 0l3.09-2.34c.41-.31.95.18.68.62z" />
      </svg>
      <span className="text-sm font-semibold hidden sm:inline">Skriv til os</span>
    </a>
  );
}
