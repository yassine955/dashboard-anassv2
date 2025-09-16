import nodemailer from "nodemailer"
import { Invoice, Client } from "@/types"

// ----------------- Transporter -----------------
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// ----------------- Email Options -----------------
export interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

// ----------------- Send Email -----------------
export async function sendEmail(options: EmailOptions) {
  const transporter = createTransporter()

  try {
    const info = await transporter.sendMail({
      from: `"Adobe Editor Dashboard" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })

    console.log("Email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// ----------------- Invoice Email HTML -----------------
export async function generateInvoiceEmailHTML(
  invoice: Invoice,
  client: Client,
  paymentLink?: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factuur ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nieuwe Factuur</h1>
        <p>Factuur ${invoice.invoiceNumber}</p>
      </div>

      <div class="content">
        <p>Beste ${client.firstName} ${client.lastName},</p>
        <p>Hierbij ontvangt u de factuur voor de geleverde diensten. Hieronder vindt u de factuurdetails:</p>

        <div class="invoice-details">
          <h3>Factuurgegevens</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Factuurnummer:</td><td style="padding: 8px 0;">${invoice.invoiceNumber}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Factuurdatum:</td><td style="padding: 8px 0;">${new Date(invoice.invoiceDate.seconds * 1000).toLocaleDateString("nl-NL")}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Vervaldatum:</td><td style="padding: 8px 0;">${new Date(invoice.dueDate.seconds * 1000).toLocaleDateString("nl-NL")}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Totaalbedrag:</td><td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #667eea;">€${invoice.totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>

        ${paymentLink
      ? `
          <div style="text-align: center; margin: 30px 0;">
            <p>U kunt deze factuur eenvoudig online betalen:</p>
            <a href="${paymentLink}" class="button">Nu Betalen</a>
          </div>`
      : ""
    }

        <p>De factuur is als PDF bijgevoegd bij deze email. Voor vragen kunt u contact met ons opnemen.</p>
        <p>Met vriendelijke groet,<br><br><strong>Adobe Editor Dashboard</strong></p>
      </div>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door Adobe Editor Dashboard.</p>
      </div>
    </body>
    </html>
  `
}

// ----------------- Payment Reminder Email HTML -----------------
export async function generatePaymentReminderHTML(
  invoice: Invoice,
  client: Client,
  paymentLink?: string
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Betalingsherinnering - Factuur ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Betalingsherinnering</h1>
        <p>Factuur ${invoice.invoiceNumber}</p>
      </div>

      <div class="content">
        <p>Beste ${client.firstName} ${client.lastName},</p>

        <div class="alert">
          <strong>Let op:</strong> De vervaldatum van onderstaande factuur is verstreken.
        </div>

        <p>Wij hebben nog geen betaling ontvangen voor factuur ${invoice.invoiceNumber}. Graag verzoeken wij u deze factuur zo spoedig mogelijk te voldoen.</p>
        <p><strong>Factuurbedrag:</strong> €${invoice.totalAmount.toFixed(
    2
  )}<br><strong>Vervaldatum:</strong> ${new Date(
    invoice.dueDate.seconds * 1000
  ).toLocaleDateString("nl-NL")}</p>

        ${paymentLink
      ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" class="button">Nu Betalen</a>
          </div>`
      : ""
    }

        <p>Mocht u deze factuur reeds hebben betaald, dan kunt u deze herinnering negeren.</p>
        <p>Voor vragen kunt u contact met ons opnemen.</p>
        <p>Met vriendelijke groet,<br><br><strong>Adobe Editor Dashboard</strong></p>
      </div>
    </body>
    </html>
  `
}