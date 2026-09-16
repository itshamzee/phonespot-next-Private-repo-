// src/lib/email/templates/inquiry-reply.tsx
import { Text } from "@react-email/components";
import BaseLayout from "./base-layout";
import type { StaffProfile, CompanySettings } from "@/lib/supabase/email-types";
import type { Signature } from "@/lib/email/signature";

interface InquiryReplyEmailProps {
  customerName: string;
  replyBody: string;
  signature?: Signature | null;
  staffProfile?: StaffProfile | null;
  companySettings?: CompanySettings | null;
}

/** "Anja Holm" -> "Anja"; an email address or empty name -> no name in the greeting. */
export function greetingName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first && !first.includes("@") ? first : "";
}

export default function InquiryReplyEmail({
  customerName,
  replyBody,
  signature,
  staffProfile,
  companySettings,
}: InquiryReplyEmailProps) {
  const first = greetingName(customerName);
  return (
    <BaseLayout
      signature={signature}
      staffProfile={staffProfile}
      companySettings={companySettings}
      previewText={replyBody.slice(0, 100)}
    >
      <Text style={{ fontSize: "15px", color: "#333", margin: "0 0 16px 0" } as const}>
        {first ? `Hej ${first},` : "Hej,"}
      </Text>
      {replyBody.split("\n").map((line, i) => (
        <Text key={i} style={{ fontSize: "15px", color: "#333", margin: "0 0 8px 0", lineHeight: "1.5" } as const}>
          {line || "\u00A0"}
        </Text>
      ))}
    </BaseLayout>
  );
}
