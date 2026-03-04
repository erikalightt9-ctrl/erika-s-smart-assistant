import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  fromName,
  replyTo,
}: {
  to:        string;
  subject:   string;
  html:      string;
  fromName?: string;  // e.g. "Erika Santos" — shown in From display name
  replyTo?:  string;  // e.g. "erika@gdscapital.com" — replies go here
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[mailer] ⚠️  SMTP_USER / SMTP_PASS not configured — email NOT sent to ${to}`);
    return;
  }

  // Build "From" display name:
  // If a sender name is provided: "Erika Santos via AILE <smtp-account@gmail.com>"
  // Otherwise falls back to env SMTP_FROM
  const smtpUser = process.env.SMTP_USER;
  const from = fromName
    ? `"${fromName} via AILE" <${smtpUser}>`
    : (process.env.SMTP_FROM ?? `"AILE Smart Office" <${smtpUser}>`);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: replyTo ?? undefined,
      subject,
      html,
    });
    console.log(`[mailer] ✅ Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[mailer] ❌ Failed to send email to ${to}:`, err);
    throw err;
  }
}
