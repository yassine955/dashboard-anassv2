import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, customMessage } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Add custom message to HTML if provided
    let finalHtml = html;
    if (customMessage) {
      finalHtml = html.replace(
        '<p>Hierbij ontvangt u de factuur voor de geleverde diensten.',
        `<p>${customMessage}</p><p>Hierbij ontvangt u de factuur voor de geleverde diensten.`
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