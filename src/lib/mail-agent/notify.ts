import { sendPushover } from "@/lib/notifications/pushover";

/** Push to the owner's phone when a mail is parked for a human. Non-fatal. */
export async function notifyNeedsHuman(opts: {
  inquiryId: string;
  summary: string;
  mailbox: string;
  from: string;
}): Promise<void> {
  await sendPushover({
    title: `Mail kræver dig · ${opts.mailbox}`,
    message: `${opts.from}: ${opts.summary}`,
    sound: "pushover",
    priority: 0,
    url: `https://phonespot.dk/admin/henvendelser?id=${opts.inquiryId}`,
    url_title: "Åbn henvendelsen",
  });
}
