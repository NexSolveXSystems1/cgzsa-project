import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { rateLimit } from "@/lib/ratelimit";
import { insertWithReference } from "@/lib/format";
import { clientAddress, rateLimitKey } from "@/lib/request";
import { sendMail } from "@/lib/email";
import { logger } from "@/lib/log";

const log = logger("newsletter");

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(200),
  consent: z.literal(true, "Please agree to receive updates before subscribing."),
  website: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientAddress(h);

  if (!rateLimit(rateLimitKey("newsletter", ip), 5, 600_000).ok) {
    return NextResponse.json(
      { error: "Too many subscription attempts from this address. Please try again later." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Please check your email and try again." }, { status: 400 });
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const { email } = parsed.data;

  try {
    const { ref } = await insertWithReference("SUB", (candidate) =>
      db.insert(contactMessages).values({
        reference: candidate,
        name: "Newsletter Subscriber",
        email,
        subject: "Newsletter Subscription",
        body: "User opted in to receive newsletter updates.",
        source: "newsletter",
        ip,
      }),
    );

    try {
      await sendMail({
        to: email,
        subject: "Subscribed to CGZSA Updates",
        text: `Thank you for subscribing to CGZSA updates! Your reference code is ${ref}.`,
      });
    } catch (mailErr) {
      log.warn("Subscriber inserted, but confirmation mail failed", { mailErr });
    }

    return NextResponse.json({ ok: true, reference: ref });
  } catch (err: unknown) {
    log.error("Failed to store subscriber", { err });
    return NextResponse.json({ error: "Could not save your subscription. Please try again." }, { status: 500 });
  }
}
