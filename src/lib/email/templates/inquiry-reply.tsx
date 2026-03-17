// src/lib/email/templates/inquiry-reply.tsx
import { Text } from "@react-email/components";
import BaseLayout from "./base-layout";
import type { StaffProfile, CompanySettings } from "@/lib/supabase/email-types";

interface InquiryReplyEmailProps {
  customerName: string;
  replyBody: string;
  staffProfile?: StaffProfile | null;
  companySettings?: CompanySettings | null;
}

export default function InquiryReplyEmail({
  customerName,
  replyBody,
  staffProfile,
  companySettings,
}: InquiryReplyEmailProps) {
  return (
    <BaseLayout
      staffProfile={staffProfile}
      companySettings={companySettings}
      previewText={replyBody.slice(0, 100)}
    >
      <Text style={{ fontSize: "15px", color: "#333", margin: "0 0 16px 0" } as const}>
        Hej {customerName},
      </Text>
      {replyBody.split("\n").map((line, i) => (
        <Text key={i} style={{ fontSize: "15px", color: "#333", margin: "0 0 8px 0", lineHeight: "1.5" } as const}>
          {line || "\u00A0"}
        </Text>
      ))}
    </BaseLayout>
  );
}
