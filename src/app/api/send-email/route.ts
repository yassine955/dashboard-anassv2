import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateInvoiceEmailHTML } from '@/lib/email';
import { invoiceService, clientService } from '@/lib/firebase-service';

export async function POST(request: NextRequest) {
  try {
    const {
      to,
      subject,
      html,
      customMessage,
      invoiceId,
      clientId,
      paymentLink
    } = await request.json();

    // If we have invoiceId and clientId, generate the email HTML
    let finalHtml = html;

    if (invoiceId && clientId) {
      try {
        // Get invoice and client data
        const [invoice, client] = await Promise.all([
          invoiceService.getInvoice(invoiceId),
          clientService.getClient(clientId)
        ]);

        if (!invoice || !client) {
          return NextResponse.json(
            { error: 'Invoice or client not found' },
            { status: 404 }
          );
        }

        // Generate email HTML with payment link
        finalHtml = await generateInvoiceEmailHTML(invoice, client, paymentLink);

        // Add custom message if provided
        if (customMessage) {
          finalHtml = finalHtml.replace(
            '<p>Hierbij ontvangt u de factuur voor de geleverde diensten.',
            `<p>${customMessage}</p><p>Hierbij ontvangt u de factuur voor de geleverde diensten.`
          );
        }
      } catch (error) {
        console.error('Error generating invoice email:', error);
        return NextResponse.json(
          { error: 'Failed to generate invoice email' },
          { status: 500 }
        );
      }
    } else if (!html) {
      return NextResponse.json(
        { error: 'Missing required fields: either html or invoiceId+clientId' },
        { status: 400 }
      );
    }

    // Check email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json(
        { error: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.' },
        { status: 500 }
      );
    }

    const result = await sendEmail({
      to,
      subject,
      html: finalHtml
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}