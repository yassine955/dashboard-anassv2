import { NextRequest, NextResponse } from "next/server";
import { handleTikkieWebhook } from "@/lib/tikkie-server";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for webhook verification
    const body = await request.text();

    // Parse the webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON in Tikkie webhook:', error);
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    console.log('Tikkie webhook received:', webhookData);

    // Process the webhook using the handler
    const processedData = handleTikkieWebhook(webhookData);

    if (!processedData.paymentId || !processedData.invoiceId) {
      console.error('Missing required webhook data:', processedData);
      return NextResponse.json(
        { error: "Missing required webhook data" },
        { status: 400 }
      );
    }

    // Update the invoice status based on payment status
    const invoiceRef = doc(db, 'invoices', processedData.invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      console.error('Invoice not found:', processedData.invoiceId);
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoiceData = invoiceDoc.data();
    let newStatus = invoiceData.status;
    let paidAt = invoiceData.paidAt;

    // Map Tikkie payment status to invoice status
    switch (processedData.status) {
      case 'PAID':
        newStatus = 'paid';
        paidAt = new Date();
        break;
      case 'CANCELLED':
      case 'EXPIRED':
        newStatus = 'cancelled';
        break;
      case 'OPEN':
        newStatus = 'sent';
        break;
      default:
        console.log('Unknown Tikkie payment status:', processedData.status);
        break;
    }

    // Update invoice if status changed
    if (newStatus !== invoiceData.status) {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
        paymentProvider: 'tikkie',
        paymentId: processedData.paymentId,
      };

      if (paidAt) {
        updateData.paidAt = paidAt;
      }

      await updateDoc(invoiceRef, updateData);

      console.log(`Invoice ${processedData.invoiceId} status updated to ${newStatus}`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      invoiceId: processedData.invoiceId,
      status: newStatus
    });

  } catch (error: any) {
    console.error('Error processing Tikkie webhook:', error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  // Some webhook services require GET endpoint verification
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    message: "Tikkie webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}