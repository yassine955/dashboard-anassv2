import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink, createCheckoutSession } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please set STRIPE_SECRET_KEY in your environment variables." },
        { status: 500 }
      );
    }

    const {
      invoiceId,
      amount,
      description,
      metadata = {},
      clientId,
      useCheckoutSession = false
    } = await request.json();

    if (!invoiceId || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceId, amount, description" },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Amount must be a positive number." },
        { status: 400 }
      );
    }

    let result;

    if (useCheckoutSession) {
      // Use checkout session for more control
      result = await createCheckoutSession({
        amount,
        description,
        metadata,
        invoiceId,
        clientId,
      });
    } else {
      // Use payment link (simpler)
      result = await createPaymentLink({
        amount,
        description,
        metadata,
        invoiceId,
        clientId,
      });
    }

    console.log(result)

    return NextResponse.json({
      url: result.url,
      id: result.id,
      type: useCheckoutSession ? 'checkout_session' : 'payment_link',
    });
  } catch (error: any) {
    console.error("Error creating payment link:", error);

    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: "Stripe authentication failed. Please check your API keys." },
        { status: 500 }
      );
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: "Invalid request to Stripe: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create payment link" },
      { status: 500 }
    );
  }
}