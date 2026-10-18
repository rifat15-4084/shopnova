import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailProvider {
  send(msg: MailMessage): Promise<void>;
}

/** Default provider: logs the message to the console (dev / no SMTP configured). */
class ConsoleMailProvider implements MailProvider {
  async send(msg: MailMessage): Promise<void> {
    logger.info(
      { to: msg.to, subject: msg.subject },
      `📧 [mail:console] To: ${msg.to} — "${msg.subject}"\n${msg.text}`,
    );
  }
}

/** SMTP provider used when SMTP_HOST is configured. Uses nodemailer if installed. */
class SmtpMailProvider implements MailProvider {
  private transport: any = null;

  async init(): Promise<void> {
    try {
      // nodemailer is optional — keep the app booting without it.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      this.transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
    } catch {
      logger.warn('nodemailer not installed — falling back to console mail provider');
      this.transport = null;
    }
  }

  async send(msg: MailMessage): Promise<void> {
    if (!this.transport) {
      const fallback = new ConsoleMailProvider();
      return fallback.send(msg);
    }
    await this.transport.sendMail({
      from: env.MAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html ?? `<pre>${msg.text}</pre>`,
    });
  }
}

let provider: MailProvider = new ConsoleMailProvider();

export async function initMail(): Promise<void> {
  if (env.SMTP_HOST) {
    const smtp = new SmtpMailProvider();
    await smtp.init();
    provider = smtp;
    logger.info(`Mail provider: SMTP (${env.SMTP_HOST})`);
  } else {
    logger.info('Mail provider: console stub');
  }
}

export const mailService = {
  send: (msg: MailMessage) => provider.send(msg).catch((err) => logger.error({ err }, 'mail failed')),

  async sendPasswordReset(to: string, name: string, token: string, expires: Date) {
    const link = `${env.CLIENT_URL}/reset-password?token=${token}&email=${encodeURIComponent(to)}`;
    return this.send({
      to,
      subject: 'Reset your ShopNova password',
      text: `Hi ${name},\n\nWe received a request to reset your password.\n\nReset link (valid until ${expires.toISOString()}):\n${link}\n\nIf you didn't request this, ignore this email.`,
    });
  },

  async sendOrderConfirmation(
    to: string,
    name: string,
    orderNumber: string,
    total: number,
    currency: string,
  ) {
    return this.send({
      to,
      subject: `Order ${orderNumber} confirmed 🎉`,
      text: `Hi ${name},\n\nThanks for your order!\n\nOrder number: ${orderNumber}\nTotal: ${currency.toUpperCase()} ${total.toFixed(2)}\n\nYou can track it any time in your ShopNova account.\n\n— The ShopNova team`,
    });
  },

  async sendOrderStatusUpdate(to: string, name: string, orderNumber: string, status: string) {
    return this.send({
      to,
      subject: `Order ${orderNumber} is now ${status}`,
      text: `Hi ${name},\n\nYour order ${orderNumber} status changed to: ${status}.\n\n— The ShopNova team`,
    });
  },
};
