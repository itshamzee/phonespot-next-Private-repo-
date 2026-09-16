export function AccessoryCategoryIcon({slug}: {slug:string}) {
 const paths: Record<string,string> = {
  covers:'M7 3h10v18H7z M10 6h4 M11 18h2',
  skaermbeskyttelse:'M7 3h10v18H7z M9 15l6-6',
  beskyttelsesglas:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  opladere:'M9 3v5 M15 3v5 M7 8h10v5a5 5 0 0 1-10 0z M12 18v4',
  lyd:'M4 14v-2a8 8 0 0 1 16 0v2 M4 12h3v8H4z M17 12h3v8h-3z',
  holdere:'M8 3h8v13H8z M12 16v5 M7 21h10',
  outlet:'M3 4h9l9 9-8 8-10-10z M7 8h.01',
 };
 return <svg aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[slug] ?? 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'}/></svg>;
}
