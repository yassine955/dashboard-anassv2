import nodemailer from "nodemailer"
import { Invoice, Client, User } from "@/types"

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

// ----------------- Template Variables -----------------
export interface TemplateVariables {
  clientName: string
  clientFirstName: string
  clientLastName: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  amount: string
  totalAmount: string
  companyName?: string
  paymentLink?: string
}

// ----------------- Template Processing -----------------
export function normalizeTemplateVariables(template: string): string {
  // Convert single braces {variable} to double braces {{variable}}
  // This makes it more user-friendly for people who forget the double braces
  const singleBracePattern = /\{([^{}]+)\}/g;
  return template.replace(singleBracePattern, (match, variableName) => {
    // Only convert if it's not already double braces and looks like a variable name
    if (match.startsWith('{{') || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(variableName.trim())) {
      return match;
    }
    return `{{${variableName}}}`;
  });
}

export function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  // First normalize single braces to double braces for better UX
  let processedTemplate = normalizeTemplateVariables(template)

  // Replace all template variables
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processedTemplate = processedTemplate.replace(regex, value)
    }
  })

  // Handle conditional payment link sections
  if (variables.paymentLink) {
    // Replace payment link conditionals with the content
    processedTemplate = processedTemplate.replace(
      /{{#if paymentLink}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g,
      '$1'
    )
    processedTemplate = processedTemplate.replace(
      /{{#if paymentLink}}([\s\S]*?){{\/if}}/g,
      '$1'
    )
  } else {
    // Replace with else content or remove if no else
    processedTemplate = processedTemplate.replace(
      /{{#if paymentLink}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g,
      '$2'
    )
    processedTemplate = processedTemplate.replace(
      /{{#if paymentLink}}([\s\S]*?){{\/if}}/g,
      ''
    )
  }

  // Remove any remaining unreplaced variables
  processedTemplate = processedTemplate.replace(/\{\{[^}]+\}\}/g, '')

  return processedTemplate
}

// ----------------- Default Templates -----------------
export const DEFAULT_INVOICE_TEMPLATE = {
  subject: "Factuur {{invoiceNumber}}",
  content: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factuur {{invoiceNumber}}</title>
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
        <p>Factuur {{invoiceNumber}}</p>
      </div>

      <div class="content">
        <p>Beste {{clientName}},</p>
        <p>Hierbij ontvangt u de factuur voor de geleverde diensten. Hieronder vindt u de factuurdetails:</p>

        <div class="invoice-details">
          <h3>Factuurgegevens</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold;">Factuurnummer:</td><td style="padding: 8px 0;">{{invoiceNumber}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Factuurdatum:</td><td style="padding: 8px 0;">{{invoiceDate}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Vervaldatum:</td><td style="padding: 8px 0;">{{dueDate}}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Totaalbedrag:</td><td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #667eea;">{{totalAmount}}</td></tr>
          </table>
        </div>

        {{#if paymentLink}}
        <div style="text-align: center; margin: 30px 0;">
          <p>U kunt deze factuur eenvoudig online betalen:</p>
          <a href="{{paymentLink}}" class="button">Nu Betalen</a>
        </div>
        {{else}}
        <div style="text-align: center; margin: 30px 0; background: #f0f0f0; padding: 15px; border-radius: 5px;">
          <p>Deze factuur is verzonden zonder betaallink. Neem contact met ons op voor betalingsinstructies.</p>
        </div>
        {{/if}}

        <p>De factuur is als PDF bijgevoegd bij deze email. Voor vragen kunt u contact met ons opnemen.</p>
        <p>Met vriendelijke groet,<br><br><strong>{{companyName}}</strong></p>
      </div>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door {{companyName}}.</p>
      </div>
    </body>
    </html>
  `
}

export const DEFAULT_PAYMENT_REMINDER_TEMPLATE = {
  subject: "Betalingsherinnering - Factuur {{invoiceNumber}}",
  content: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Betalingsherinnering - Factuur {{invoiceNumber}}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Betalingsherinnering</h1>
        <p>Factuur {{invoiceNumber}}</p>
      </div>

      <div class="content">
        <p>Beste {{clientName}},</p>

        <div class="alert">
          <strong>Let op:</strong> De vervaldatum van onderstaande factuur is verstreken.
        </div>

        <p>Wij hebben nog geen betaling ontvangen voor factuur {{invoiceNumber}}. Graag verzoeken wij u deze factuur zo spoedig mogelijk te voldoen.</p>
        <p><strong>Factuurbedrag:</strong> {{totalAmount}}<br><strong>Vervaldatum:</strong> {{dueDate}}</p>

        {{#if paymentLink}}
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{paymentLink}}" class="button">Nu Betalen</a>
        </div>
        {{/if}}

        <p>Mocht u deze factuur reeds hebben betaald, dan kunt u deze herinnering negeren.</p>
        <p>Voor vragen kunt u contact met ons opnemen.</p>
        <p>Met vriendelijke groet,<br><br><strong>{{companyName}}</strong></p>
      </div>

      <div class="footer">
        <p>Deze email is automatisch gegenereerd door {{companyName}}.</p>
      </div>
    </body>
    </html>
  `
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
  user?: User,
  paymentLink?: string,
  customMessage?: string
) {
  // Validate required data
  if (!invoice || !client) {
    throw new Error('Invoice and client data are required');
  }

  if (!invoice.invoiceNumber || !invoice.totalAmount) {
    throw new Error('Invoice number and total amount are required');
  }

  if (!client.firstName || !client.lastName) {
    throw new Error('Client name is required');
  }

  // Prepare template variables
  const variables: TemplateVariables = {
    clientName: `${client.firstName} ${client.lastName}`,
    clientFirstName: client.firstName,
    clientLastName: client.lastName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toDate ? invoice.invoiceDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    dueDate: invoice.dueDate?.toDate ? invoice.dueDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    amount: `€${invoice.totalAmount.toFixed(2)}`,
    totalAmount: `€${invoice.totalAmount.toFixed(2)}`,
    companyName: user?.businessInfo?.companyName || "Adobe Editor Dashboard",
    paymentLink: paymentLink
  }

  // Use custom template if available, otherwise use default
  let template = DEFAULT_INVOICE_TEMPLATE.content
  if (user?.emailTemplates?.invoiceEmail?.isCustom && user.emailTemplates.invoiceEmail.content) {
    template = user.emailTemplates.invoiceEmail.content
  }

  // Replace template variables
  let processedHTML = replaceTemplateVariables(template, variables)

  // Add custom message if provided
  if (customMessage) {
    processedHTML = processedHTML.replace(
      '<p>Hierbij ontvangt u de factuur voor de geleverde diensten.',
      `<p>${customMessage}</p><p>Hierbij ontvangt u de factuur voor de geleverde diensten.`
    )
  }

  return processedHTML
}

// ----------------- Payment Reminder Email HTML -----------------
export async function generatePaymentReminderHTML(
  invoice: Invoice,
  client: Client,
  user?: User,
  paymentLink?: string,
  customMessage?: string
) {
  // Validate required data
  if (!invoice || !client) {
    throw new Error('Invoice and client data are required');
  }

  if (!invoice.invoiceNumber || !invoice.totalAmount) {
    throw new Error('Invoice number and total amount are required');
  }

  if (!client.firstName || !client.lastName) {
    throw new Error('Client name is required');
  }

  // Prepare template variables
  const variables: TemplateVariables = {
    clientName: `${client.firstName} ${client.lastName}`,
    clientFirstName: client.firstName,
    clientLastName: client.lastName,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toDate ? invoice.invoiceDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    dueDate: invoice.dueDate?.toDate ? invoice.dueDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    amount: `€${invoice.totalAmount.toFixed(2)}`,
    totalAmount: `€${invoice.totalAmount.toFixed(2)}`,
    companyName: user?.businessInfo?.companyName || "Adobe Editor Dashboard",
    paymentLink: paymentLink
  }

  // Use custom template if available, otherwise use default
  let template = DEFAULT_PAYMENT_REMINDER_TEMPLATE.content
  if (user?.emailTemplates?.paymentReminder?.isCustom && user.emailTemplates.paymentReminder.content) {
    template = user.emailTemplates.paymentReminder.content
  }

  // Replace template variables
  let processedHTML = replaceTemplateVariables(template, variables)

  // Add custom message if provided
  if (customMessage) {
    processedHTML = processedHTML.replace(
      '<p>Wij hebben nog geen betaling ontvangen',
      `<p>${customMessage}</p><p>Wij hebben nog geen betaling ontvangen`
    )
  }

  return processedHTML
}

// ----------------- Generate Email Subject -----------------
export function generateEmailSubject(
  template: 'invoice' | 'paymentReminder',
  invoice: Invoice,
  user?: User
): string {
  const variables: TemplateVariables = {
    clientName: '',
    clientFirstName: '',
    clientLastName: '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate?.toDate ? invoice.invoiceDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    dueDate: invoice.dueDate?.toDate ? invoice.dueDate.toDate().toLocaleDateString("nl-NL") : new Date().toLocaleDateString("nl-NL"),
    amount: `€${invoice.totalAmount.toFixed(2)}`,
    totalAmount: `€${invoice.totalAmount.toFixed(2)}`,
    companyName: user?.businessInfo?.companyName || "Adobe Editor Dashboard"
  }

  let subject = ''
  if (template === 'invoice') {
    subject = user?.emailTemplates?.invoiceEmail?.isCustom && user.emailTemplates.invoiceEmail.subject
      ? user.emailTemplates.invoiceEmail.subject
      : DEFAULT_INVOICE_TEMPLATE.subject
  } else {
    subject = user?.emailTemplates?.paymentReminder?.isCustom && user.emailTemplates.paymentReminder.subject
      ? user.emailTemplates.paymentReminder.subject
      : DEFAULT_PAYMENT_REMINDER_TEMPLATE.subject
  }

  return replaceTemplateVariables(subject, variables)
}