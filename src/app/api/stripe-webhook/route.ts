import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Stripe from "stripe";

// Helper function to safely update Firebase documents (filters out undefined values)
function createSafeUpdateData(data: Record<string, any>): Record<string, any> {
    const safeData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
            safeData[key] = value;
        }
    }
    return safeData;
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("Missing Stripe signature or webhook secret");
        return NextResponse.json(
            { error: "Missing Stripe signature or webhook secret" },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        if (!stripe) {
            return NextResponse.json(
                { error: "Stripe not configured" },
                { status: 500 }
            );
        }

        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return NextResponse.json(
            { error: "Webhook signature verification failed" },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Extract invoice ID from metadata
                const invoiceId = session.metadata?.invoiceId;
                const clientId = session.metadata?.clientId;

                if (!invoiceId) {
                    console.error("No invoice ID found in payment session metadata");
                    break;
                }

                // Update invoice status to paid
                const updateData = createSafeUpdateData({
                    status: "paid",
                    paymentLink: session.url,
                });

                await updateDoc(doc(db, 'invoices', invoiceId), updateData);

                console.log(`Invoice ${invoiceId} marked as paid`);
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;

                // Extract invoice ID from metadata
                const invoiceId = paymentIntent.metadata?.invoiceId;

                if (!invoiceId) {
                    console.error("No invoice ID found in payment intent metadata");
                    break;
                }

                // Update invoice status to paid
                await updateDoc(doc(db, 'invoices', invoiceId), {
                    status: "paid",
                });

                console.log(`Invoice ${invoiceId} marked as paid via payment intent`);
                break;
            }

            // Payment links don't have a specific "payment_succeeded" event
            // They use checkout.session.completed events instead

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;

                // Extract invoice ID from metadata
                const invoiceId = invoice.metadata?.invoiceId;

                if (!invoiceId) {
                    console.error("No invoice ID found in Stripe invoice metadata");
                    break;
                }

                // Update invoice status to paid
                await updateDoc(doc(db, 'invoices', invoiceId), {
                    status: "paid",
                });

                console.log(`Invoice ${invoiceId} marked as paid via Stripe invoice`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

// Handle GET requests (for webhook endpoint verification)
export async function GET() {
    return NextResponse.json({
        message: "Stripe webhook endpoint is active",
        timestamp: new Date().toISOString()
    });
}
