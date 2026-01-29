import nodemailer from 'nodemailer';
import { fetchWithProxy } from '@/lib/proxy';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type TelegramPayload = {
  token: string;
  chatId: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload) {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT ?? 0);
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !port || !user || !pass || !from) {
    throw new Error('Missing SMTP configuration.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

export async function sendTelegram(payload: TelegramPayload) {
  const response = await fetchWithProxy(`https://api.telegram.org/bot${payload.token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: payload.chatId,
      text: payload.text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Telegram send failed.');
  }
}
