"use client";

import Link from "next/link";
import { useB2B } from "@/components/b2b/b2b-context";

export default function B2BHeaderBar() {
  const { isLoggedIn, isApproved, user, loading, logout } = useB2B();

  if (loading) return null;

  /* --- Logged in + approved --- */
  if (isLoggedIn && isApproved && user) {
    return (
      <div className="flex items-center justify-between gap-4 bg-[#1A3D2E]/10 border-b border-[#1A3D2E]/15 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1A3D2E] shrink-0" aria-hidden />
          <span className="text-sm font-medium text-[#1A3D2E]">
            {user.companyName}
            {user.cvrNummer && (
              <span className="ml-1.5 text-[#1A3D2E]/60 font-normal">
                (CVR: {user.cvrNummer})
              </span>
            )}
          </span>
        </div>
        <button
          onClick={logout}
          className="rounded-full border border-[#1A3D2E]/25 px-3 py-1 text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-[#1A3D2E] hover:text-white hover:border-[#1A3D2E]"
        >
          Log ud
        </button>
      </div>
    );
  }

  /* --- Logged in + NOT approved --- */
  if (isLoggedIn && !isApproved) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-amber-800">
          Din konto afventer godkendelse — vi kontakter dig snarest
        </p>
      </div>
    );
  }

  /* --- Not logged in --- */
  return (
    <div className="flex items-center justify-between gap-4 bg-[#1A3D2E] px-4 py-2.5">
      <p className="text-sm text-white/90">
        B2B Reservedele — Log ind for engros-priser
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/b2b/login"
          className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-[#1A3D2E]"
        >
          Log ind
        </Link>
        <Link
          href="/b2b/registrer"
          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1A3D2E] transition-colors hover:bg-white/90"
        >
          Registrer
        </Link>
      </div>
    </div>
  );
}
