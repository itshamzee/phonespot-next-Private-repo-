import { redirect } from "next/navigation";

/** "Ny indlevering" er erstattet af "Ny sag": der er kun én måde at oprette en sag på. */
export default function IndleveringRedirect() {
  redirect("/admin/reparationer/ny");
}
