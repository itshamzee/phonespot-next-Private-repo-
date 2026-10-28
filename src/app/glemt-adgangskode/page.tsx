import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginLinkForm } from "./login-link-form";

export const metadata: Metadata = {
  title: "Glemt adgangskode | PhoneSpot",
  robots: { index: false, follow: false },
};

export default function GlemtAdgangskodePage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <Suspense>
        <LoginLinkForm />
      </Suspense>
    </div>
  );
}
