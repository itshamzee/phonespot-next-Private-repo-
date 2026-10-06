import { redirect } from "next/navigation";

/** Den gamle prisliste er erstattet af Varer, Reparationer. */
export default function PrislisteRedirect() {
  redirect("/admin/varer/reparationer");
}
