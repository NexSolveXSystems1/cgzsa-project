import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { volunteerApplications } from "@/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { insertWithReference, reference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { sendMail } from "@/lib/email";
import { getSiteSettings } from "@/lib/settings";
import { logger } from "@/lib/log";

const log = logger("volunteer");

export const runtime = "nodejs";

const Body = z.object({
  firstName: z.string().trim().min(2, "Enter your first name.").max(80),
  lastName: z.string().trim().min(2, "Enter your last name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional(),
  county: z.string().trim().max(80).optional(),
  interest: z.string().trim().min(2, "Choose where you would like to help.").max(120),
  note: z.string().trim().max(2000).optional(),
  consent: z.literal(true, "Please agree before sending."),
  website: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientAddress(h);
  if (!rateLimit(rateLimitKey("volunteer", ip), 4, 600_000).ok) {
    return NextResponse.json({ error: "Too many applications from this address. Please try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Please check the form.", field: first?.path[0] }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true, reference: reference("VOL") });

  const d = parsed.data;

  // Stored first, with a retry if the generated reference collides.
  let ref: string;
  try {
    ({ ref } = await insertWithReference("VOL", (candidate) =>
      db.insert(volunteerApplications).values({
        reference: candidate, firstName: d.firstName, lastName: d.lastName, email: d.email,
        phone: d.phone || null, county: d.county || null, interest: d.interest, note: d.note || null,
      }),
    ));
  } catch (err) {
    log.error("could not store application", { err });
    return NextResponse.json(
      { error: "We could not record your application. Please try again, or email us directly." },
      { status: 503 },
    );
  }

  // The application is stored, so a mail failure must not fail the request.
  try {
    const settings = await getSiteSettings();
    await sendMail({
      to: settings.contactRecipient,
      subject: `Volunteer application ${ref} — ${d.firstName} ${d.lastName}`,
      replyTo: d.email,
      text: [`Reference: ${ref}`, `Name: ${d.firstName} ${d.lastName}`, `Email: ${d.email}`,
        `Phone: ${d.phone ?? "—"}`, `County: ${d.county ?? "—"}`, `Interest: ${d.interest}`,
        "", d.note ?? ""].join("\n"),
    });
  } catch (err) {
    log.error("stored, but notification failed", { err });
  }

  return NextResponse.json({ ok: true, reference: ref });
}
