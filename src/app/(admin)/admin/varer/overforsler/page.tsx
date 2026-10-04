import { staffScopeForPage } from "@/lib/auth/store-scope-page";
import { listTransfers } from "@/lib/transfers/service";
import { myStoreSlug } from "@/lib/stock/rules";
import { TransferBoard } from "@/components/admin/varer/transfer-board";
import { VarerTabs } from "@/components/admin/varer/varer-tabs";

export const dynamic = "force-dynamic";

export default async function OverforslerPage() {
  const auth = await staffScopeForPage();
  if (!auth) {
    return <p className="text-[15px] text-[#5E6A63]">Log ind som personale for at se overførsler.</p>;
  }
  const { staff, scope } = auth;
  const transfers = await listTransfers(staff, scope);
  const open = transfers.filter((t) => t.status === "requested" || t.status === "sent").length;

  return (
    <div className="flex flex-col gap-5 text-[#15211B]">
      <VarerTabs active="overforsler" transferCount={open} />
      <TransferBoard transfers={transfers} mine={myStoreSlug(staff, scope)} />
    </div>
  );
}
