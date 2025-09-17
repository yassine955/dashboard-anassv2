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

    // Validate amount - ensure it's a number
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
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

    if (!stripeSettings?.isActive) {
      return NextResponse.json(
        { error: "Stripe is not configured for this user. Please configure Stripe in your settings." },
        { status: 400 }
      );
    }

    // Determine which Stripe credentials to use
    let stripeSecretKey, stripePublishableKey, stripeAccountId;

    if (stripeSettings.accessToken && stripeSettings.accountId) {
      // Use Stripe Connect
      stripeSecretKey = process.env.STRIPE_SECRET_KEY; // Platform secret key
      stripePublishableKey = stripeSettings.publishableKey;
      stripeAccountId = stripeSettings.accountId;
    } else if (stripeSettings.manualSecretKey && stripeSettings.manualPublishableKey) {
      // Use manual API keys (legacy/developer mode)
      stripeSecretKey = stripeSettings.manualSecretKey;
      stripePublishableKey = stripeSettings.manualPublishableKey;
    } else {
      return NextResponse.json(
        { error: "No valid Stripe configuration found. Please connect your Stripe account." },
        { status: 400 }
      );
    }

    let result;

    if (useCheckoutSession) {
      // Use checkout session for more control
      result = await createCheckoutSession({
        amount: numericAmount,
        description,
        metadata,
        invoiceId,
        clientId,
        stripeSecretKey,
        stripePublishableKey,
        stripeAccountId,
      });
    } else {
      // Use payment link (simpler)
      result = await createPaymentLink({
        amount: numericAmount,
        description,
        metadata,
        invoiceId,
        clientId,
        stripeSecretKey,
        stripePublishableKey,
        stripeAccountId,
      });
    }

    console.log("Stripe result:", result);

    return NextResponse.json({
      url: result.url,
      id: result.id,
      type: useCheckoutSession ? 'checkout_session' : 'payment_link',
    });
  } catch (error: any) {
    console.error("Error creating payment link:", error);
    
    // Log the full error for debugging
    console.error("Full error details:", {
      message: error.message,
      stack: error.stack,
      type: error.type,
      raw: error
    });

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

    // Handle generic errors
    const errorMessage = error.message || "Failed to create payment link";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}