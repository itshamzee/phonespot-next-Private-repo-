import { B2BProvider } from "@/components/b2b/b2b-context";
import B2BHeaderBar from "@/components/b2b/b2b-header-bar";

export default function ReservedeleLayout({ children }: { children: React.ReactNode }) {
  return (
    <B2BProvider>
      <B2BHeaderBar />
      {children}
    </B2BProvider>
  );
}
