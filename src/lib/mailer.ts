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
  username: string | null;
  temporaryPassword: string;
}): Promise<void> {
  const { to, name, username, temporaryPassword } = options;
  const subject = `Detail login ${APP_NAME} Anda`;

  const loginHint = username
    ? `Masuk dengan email Anda atau nama pengguna "${username}", beserta kata sandi ini.`
    : "Masuk dengan alamat email Anda dan kata sandi ini.";

  const text = [
    `Halo ${name},`,
    "",
    `Anda telah ditambahkan ke ${APP_NAME}.`,
    username ? `Nama pengguna Anda: ${username}` : null,
    `Kata sandi sementara Anda adalah: ${temporaryPassword}`,
    "",
    loginHint,
    "Pada login pertama, Anda akan diminta memilih kata sandi Anda sendiri.",
    "",
    "Jika Anda tidak mengharapkan ini, silakan hubungi administrator Anda.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Halo ${name},</p>
      <p>Anda telah ditambahkan ke ${APP_NAME}. Gunakan kata sandi sementara di bawah ini untuk masuk:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;padding:12px 16px;background:#f1f5f9;border-radius:8px;display:inline-block">${temporaryPassword}</p>
      ${username ? `<p>Nama pengguna Anda: <strong>${username}</strong></p>` : ""}
      <p>Pada login pertama, Anda akan diminta memilih kata sandi Anda sendiri.</p>
      <p style="color:#64748b;font-size:13px">Jika Anda tidak mengharapkan ini, silakan hubungi administrator Anda.</p>
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
  const subject = `Reset kata sandi ${APP_NAME}`;

  const text = [
    `Halo ${name},`,
    "",
    `Kami menerima permintaan untuk mereset kata sandi ${APP_NAME} Anda.`,
    `Kata sandi sementara Anda adalah: ${temporaryPassword}`,
    "",
    `Kata sandi ini kedaluwarsa dalam ${expiresMinutes} menit. Buka halaman lupa kata sandi,`,
    "masukkan kata sandi sementara ini bersama kata sandi baru Anda.",
    "",
    "Jika Anda tidak meminta ini, Anda dapat mengabaikan email ini dengan aman.",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Halo ${name},</p>
      <p>Kami menerima permintaan untuk mereset kata sandi ${APP_NAME} Anda. Gunakan kata sandi sementara di bawah ini:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:2px;padding:12px 16px;background:#f1f5f9;border-radius:8px;display:inline-block">${temporaryPassword}</p>
      <p>Kata sandi ini kedaluwarsa dalam ${expiresMinutes} menit. Buka halaman lupa kata sandi dan masukkan kata sandi sementara ini bersama kata sandi baru Anda.</p>
      <p style="color:#64748b;font-size:13px">Jika Anda tidak meminta ini, Anda dapat mengabaikan email ini dengan aman.</p>
    </div>
  `;

  await sendMail({ to, subject, text, html });
}
