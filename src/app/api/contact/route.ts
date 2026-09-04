import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { insertWithReference, reference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { sendMail } from "@/lib/email";
import { getSiteSettings } from "@/lib/settings";
import { logger } from "@/lib/log";

const log = logger("contact");

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120, "That name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(2, "Choose a subject.").max(120),
  message: z.string().trim().min(10, "Please write a little more so we can help.").max(4000, "That message is too long."),
  consent: z.literal(true, "Please agree before sending."),
  // Honeypot. Accepted by the schema so the check below can decide what to do.
  website: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientAddress(h);
  if (!rateLimit(rateLimitKey("contact", ip), 5, 600_000).ok) {
    return NextResponse.json({ error: "Too many messages from this address. Please try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Please check the form and try again.", field: first?.path[0] }, { status: 400 });
  }
  if (parsed.data.website) {
    // Silently accept and discard: a bot should not learn that it was caught.
    return NextResponse.json({ ok: true, reference: reference("MSG") });
  }

  const d = parsed.data;

  // Stored first, emailed second, so a mail outage never loses a message.
  // The insert retries on a duplicate reference rather than failing the request.
  let ref: string;
  try {
    ({ ref } = await insertWithReference("MSG", (candidate) =>
      db.insert(contactMessages).values({
        reference: candidate,
        name: d.name,
        email: d.email,
        phone: d.phone || null,
        subject: d.subject,
        body: d.message,
        ip,
      }),
    ));
  } catch (err) {
    log.error("could not store message", { err });
    return NextResponse.json(
      { error: "We could not record your message. Please try again, or email us directly." },
      { status: 503 },
    );
  }

  // The message is safely stored by this point, so a mail failure is reported to
  // the log and not to the visitor — their enquiry is not lost either way.
  try {
    const settings = await getSiteSettings();
    await sendMail({
      to: settings.contactRecipient,
      subject: `Contact message ${ref} — ${d.subject}`,
      replyTo: d.email,
      text: [
        `Reference: ${ref}`,
        `From: ${d.name} <${d.email}>`,
        `Phone: ${d.phone || "—"}`,
        `Subject: ${d.subject}`,
        "",
        d.message,
        "",
        "—",
        "Reply to this email to answer the sender directly.",
      ].join("\n"),
    });
  } catch (err) {
    log.error("stored, but notification failed", { err });
  }

  return NextResponse.json({ ok: true, reference: ref });
}
