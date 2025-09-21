import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generatePaymentReminderHTML, generateEmailSubject } from '@/lib/email';
import { generateInvoicePDF } from '@/lib/pdf';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Invoice, Client, User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const {
      to,
      customMessage,
      invoiceId,
      clientId,
      userId,
      paymentLink
    } = await request.json();

    // Validate required fields
    if (!invoiceId || !clientId || !userId || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, clientId, userId, and to are required' },
        { status: 400 }
      );
    }

    try {
      // Get invoice, client, and user data
      const [invoiceDoc, clientDoc, userDoc] = await Promise.all([
        getDoc(doc(db, 'invoices', invoiceId)),
        getDoc(doc(db, 'clients', clientId)),
        getDoc(doc(db, 'users', userId))
      ]);

      const invoice = invoiceDoc.exists() ? { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice : null;
      const client = clientDoc.exists() ? { id: clientDoc.id, ...clientDoc.data() } as Client : null;
      const user = userDoc.exists() ? { uid: userDoc.id, ...userDoc.data() } as User : null;

      if (!invoice || !client || !user) {
        return NextResponse.json(
          { error: 'Invoice, client, or user not found' },
          { status: 404 }
        );
      }

      // Check if invoice is eligible for payment reminder
      if (invoice.status === 'paid') {
        return NextResponse.json(
          { error: 'Cannot send payment reminder for paid invoice' },
          { status: 400 }
        );
      }

      // Generate email HTML and subject
      const emailHTML = await generatePaymentReminderHTML(invoice, client, user, paymentLink, customMessage);
      const emailSubject = generateEmailSubject('paymentReminder', invoice, user);

      // Check email configuration
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email configuration missing:', {
          EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
          EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing'
        });
        return NextResponse.json(
          { error: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.' },
          { status: 500 }
        );
      }

      // Generate PDF attachment
      let attachments = undefined;
      try {
        // Generate PDF only if user data is available
        if (user) {
          const pdfBuffer = await generateInvoicePDF(invoice, client, user);
          attachments = [{
            filename: `Factuur-${invoice.invoiceNumber}.pdf`,
            content: Buffer.from(pdfBuffer),
            contentType: 'application/pdf'
          }];
          console.log(`Generated PDF attachment for payment reminder ${invoice.invoiceNumber}`);
        } else {
          console.warn('User data not available for PDF generation, skipping attachment');
        }
      } catch (pdfError) {
        console.error('Error generating PDF attachment for payment reminder:', pdfError);
        // Continue without attachment rather than failing the whole email
      }

      const result = await sendEmail({
        to,
        subject: emailSubject,
        html: emailHTML,
        attachments
      });

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        subject: emailSubject
      });
    } catch (error) {
      console.error('Error generating payment reminder email:', error);
      return NextResponse.json(
        { error: `Failed to generate payment reminder email: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return NextResponse.json(
      { error: 'Failed to send payment reminder' },
      { status: 500 }
    );
  }
}