import { B2BProvider } from "@/components/b2b/b2b-context";

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return <B2BProvider>{children}</B2BProvider>;
}
