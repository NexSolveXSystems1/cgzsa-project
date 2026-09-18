/**
 * Outbound email.
 *
 * Design review §15: contact messages are stored first and emailed second, so a
 * mail outage never loses a message. If SMTP_URL is unset the message is logged
 * and the caller continues — sending is best-effort by design.
 */
import nodemailer from "nodemailer";
import { logger } from "@/lib/log";

const log = logger("email");

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  const url = process.env.SMTP_URL;
  if (!url) return null;
  transport ??= nodemailer.createTransport(url);
  return transport;
}

export async function sendMail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  const t = getTransport();
  if (!t) {
    log.info(`SMTP_URL not set. Would have sent to ${opts.to}: ${opts.subject}`);
    return { sent: false as const, reason: "not_configured" };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? "CGZSA website <no-reply@cgzsa.org>",
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    return { sent: true as const };
  } catch (err) {
    log.error("send failed", { err });
    return { sent: false as const, reason: "send_failed" };
  }
}
