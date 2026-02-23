"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { ReactNode } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

export function StripeProvider({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: ReactNode;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "flat",
          variables: {
            colorPrimary: "#5A8C6F",
            colorBackground: "#F5F2EC",
            colorText: "#3A3D38",
            fontFamily: "DM Sans, system-ui, sans-serif",
            borderRadius: "12px",
          },
        },
        locale: "da",
      }}
    >
      {children}
    </Elements>
  );
}
