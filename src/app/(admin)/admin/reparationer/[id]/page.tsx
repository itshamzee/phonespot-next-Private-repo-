import CasePage from "@/components/admin/repairs/case-page";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CasePage id={id} />;
}
