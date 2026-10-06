import { redirect } from "next/navigation";

/** Gammelt prislistelink for et mærke: kataloget har ét samlet træ, så vi lander på siden. */
export default function PrislisteBrandRedirect() {
  redirect("/admin/varer/reparationer");
}
