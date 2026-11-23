/** Fælles klasser for Statistik (fra docs/design/admin-2026-11/Statistik.html). Ingen "use client", så server og klient kan dele dem. */

/** Flade: 12px radius, kant, ingen skygge. stat-panel deles ikke over to sider ved print (statistik.css). */
export const surfaceClass =
  "stat-panel min-w-0 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[22px] min-[980px]:px-[30px] min-[980px]:py-7";

/** Flade, der toner ind ved første visning. */
export const cardClass = `stat-rise ${surfaceClass}`;

export const h2Class = "m-0 text-[18px] font-bold";
