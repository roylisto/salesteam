import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Salesteam";

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE =
  (process.env.SMTP_SECURE ?? (SMTP_PORT === 465 ? "true" : "false")) ===
  "true";

export const MAIL_FROM = process.env.SMTP_FROM ?? "no-reply@localhost";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: process.env.SMTP_USERNAME
      ? { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  return cachedTransporter;
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends an email through the configured SMTP server. When SMTP is not
 * configured (e.g. a fresh dev environment without `.env` values) the message
 * is logged to the server console instead of failing the request.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.info(
      `[mailer] SMTP not configured; skipping email to ${message.to}.\n${message.text}`,
    );
    return;
  }

  await getTransporter().sendMail({
    from: MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

/** Emails the system-generated initial password to a newly added member. */
export async function sendMemberCredentialsEmail(options: {
  to: string;
  name: string;
  temporaryPassword: string;
}): Promise<void> {
  const { to, name, temporaryPassword } = options;
  const subject = `Your ${APP_NAME} login details`;

  const text = [
    `Hi ${name},`,
    "",
    `You have been added to ${APP_NAME}.`,
    `Your temporary password is: ${temporaryPassword}`,
    "",
    "Sign in with your email address and this password. On your first sign-in",
    "you will be asked to choose your own password.",
    "",
    "If you were not expecting this, please contact your administrator.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Hi ${name},</p>
      <p>You have been added to ${APP_NAME}. Use the temporary password below to sign in:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;padding:12px 16px;background:#f1f5f9;border-radius:8px;display:inline-block">${temporaryPassword}</p>
      <p>On your first sign-in you will be asked to choose your own password.</p>
      <p style="color:#64748b;font-size:13px">If you were not expecting this, please contact your administrator.</p>
    </div>
  `;

  await sendMail({ to, subject, text, html });
}

/** Emails a freshly issued temporary password to a member. */
export async function sendTemporaryPasswordEmail(options: {
  to: string;
  name: string;
  temporaryPassword: string;
  expiresMinutes: number;
}): Promise<void> {
  const { to, name, temporaryPassword, expiresMinutes } = options;
  const subject = `${APP_NAME} password reset`;

  const text = [
    `Hi ${name},`,
    "",
    `We received a request to reset your ${APP_NAME} password.`,
    `Your temporary password is: ${temporaryPassword}`,
    "",
    `It expires in ${expiresMinutes} minutes. Open the forgot-password page,`,
    "enter this temporary password together with your new password.",
    "",
    "If you did not request this, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Hi ${name},</p>
      <p>We received a request to reset your ${APP_NAME} password. Use the temporary password below:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;padding:12px 16px;background:#f1f5f9;border-radius:8px;display:inline-block">${temporaryPassword}</p>
      <p>It expires in ${expiresMinutes} minutes. Open the forgot-password page and enter this temporary password together with your new password.</p>
      <p style="color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  await sendMail({ to, subject, text, html });
}
