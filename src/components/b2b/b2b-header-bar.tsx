"use client";

import Link from "next/link";
import { useB2B } from "@/components/b2b/b2b-context";

export default function B2BHeaderBar() {
  const { isLoggedIn, isApproved, user, loading, logout } = useB2B();

  if (loading) return null;

  /* --- Logged in + approved --- */
  if (isLoggedIn && isApproved && user) {
    return (
      <div className="border-b border-[#E5E5EA] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
            <span className="font-medium text-[#111111]">
              {user.companyName}
            </span>
            {user.cvrNummer && (
              <span className="hidden text-[#86868B] sm:inline">
                CVR {user.cvrNummer}
              </span>
            )}
          </div>
          <button
            onClick={logout}
            className="text-xs font-medium text-[#86868B] transition-colors hover:text-[#111111]"
          >
            Log ud
          </button>
        </div>
      </div>
    );
  }

  /* --- Logged in + NOT approved --- */
  if (isLoggedIn && !isApproved) {
    return (
      <div className="border-b border-amber-200 bg-amber-50/50">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          <p className="text-xs text-amber-700">
            Din konto afventer godkendelse
          </p>
        </div>
      </div>
    );
  }

  /* --- Not logged in --- */
  return (
    <div className="border-b border-[#E5E5EA] bg-[#F7F7F8]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <p className="text-xs text-[#86868B]">
          Priser kun synlige for godkendte forhandlere
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/b2b/login"
            className="text-xs font-medium text-[#1A3D2E] transition-colors hover:underline"
          >
            Log ind
          </Link>
          <Link
            href="/b2b/registrer"
            className="rounded-full bg-[#1A3D2E] px-3.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Bliv forhandler
          </Link>
        </div>
      </div>
    </div>
  );
}
