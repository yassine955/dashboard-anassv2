import { NextRequest, NextResponse } from "next/server";
import { handleINGWebhook } from "@/lib/ing-server";
import { invoiceService } from "@/lib/firebase-service";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('ING Webhook received:', payload);

    // Process the webhook
    const webhookData = handleINGWebhook(payload);

    if (webhookData.paymentId && webhookData.status && webhookData.invoiceId) {
      // Update invoice status based on ING payment status
      if (webhookData.status === 'ACCP' || webhookData.status === 'ACSC') {
        // Payment accepted/completed
        try {
          // Find invoice by ID and update status
          await invoiceService.updateInvoice(webhookData.invoiceId, {
            status: 'paid'
          });

          console.log(`Invoice ${webhookData.invoiceId} marked as paid via ING webhook`);
        } catch (error) {
          console.error('Error updating invoice from ING webhook:', error);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing ING webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification if needed
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ING webhook endpoint active' });
}