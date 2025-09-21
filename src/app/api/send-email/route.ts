import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateInvoiceEmailHTML, generateEmailSubject } from '@/lib/email';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Invoice, Client, User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const {
      to,
      subject,
      html,
      customMessage,
      invoiceId,
      clientId,
      userId,
      paymentLink
    } = await request.json();

    // If we have invoiceId and clientId, generate the email HTML
    let finalHtml = html;
    let finalSubject = subject;

    if (invoiceId && clientId) {
      try {
        // Get invoice, client, and user data
        const [invoiceDoc, clientDoc, userDoc] = await Promise.all([
          getDoc(doc(db, 'invoices', invoiceId)),
          getDoc(doc(db, 'clients', clientId)),
          userId ? getDoc(doc(db, 'users', userId)) : Promise.resolve(null)
        ]);

        const invoice = invoiceDoc.exists() ? { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice : null;
        const client = clientDoc.exists() ? { id: clientDoc.id, ...clientDoc.data() } as Client : null;
        const user = userDoc?.exists() ? { uid: userDoc.id, ...userDoc.data() } as User : null;

        if (!invoice || !client) {
          return NextResponse.json(
            { error: 'Invoice or client not found' },
            { status: 404 }
          );
        }

        // Generate email HTML and subject with custom templates
        finalHtml = await generateInvoiceEmailHTML(invoice, client, user || undefined, paymentLink, customMessage);

        // Generate subject if not provided
        if (!finalSubject) {
          finalSubject = generateEmailSubject('invoice', invoice, user || undefined);
        }
      } catch (error) {
        console.error('Error generating invoice email:', error);
        return NextResponse.json(
          { error: `Failed to generate invoice email: ${error instanceof Error ? error.message : 'Unknown error'}` },
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
      console.error('Email configuration missing:', {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing'
      });
      return NextResponse.json(
        { error: 'Email not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.' },
        { status: 500 }
      );
    }

    const result = await sendEmail({
      to,
      subject: finalSubject || subject,
      html: finalHtml
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      subject: finalSubject || subject
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}