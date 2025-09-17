import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink, createCheckoutSession } from "@/lib/stripe-server";
import { auth } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create payment links." },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // For now, we'll extract userId from the request body
    // In a real app, you'd verify the JWT token here

    const {
      invoiceId,
      amount,
      description,
      metadata = {},
      clientId,
      useCheckoutSession = false,
      userId
    } = await request.json();

    if (!invoiceId || !amount || !description || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceId, amount, description, userId" },
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

    // Get user's Stripe configuration
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeSettings = userData.paymentSettings?.stripe;

    if (!stripeSettings?.isActive || !stripeSettings?.secretKey || !stripeSettings?.publishableKey) {
      return NextResponse.json(
        { error: "Stripe is not configured for this user. Please configure Stripe in your settings." },
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
        stripeSecretKey: stripeSettings.secretKey,
        stripePublishableKey: stripeSettings.publishableKey,
      });
    } else {
      // Use payment link (simpler)
      result = await createPaymentLink({
        amount,
        description,
        metadata,
        invoiceId,
        clientId,
        stripeSecretKey: stripeSettings.secretKey,
        stripePublishableKey: stripeSettings.publishableKey,
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