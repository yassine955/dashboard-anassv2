import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { publishableKey, secretKey } = await request.json();

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing publishableKey or secretKey" },
        { status: 400 }
      );
    }

    // Validate key formats
    if (!publishableKey.startsWith('pk_') || !secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: "Invalid key format. Publishable key should start with 'pk_' and secret key with 'sk_'" },
        { status: 400 }
      );
    }

    // Test the secret key by initializing Stripe and making a simple API call
    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });

    // Try to retrieve account info to test connection
    const account = await stripe.accounts.retrieve();

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        country: account.country,
        email: account.email,
        type: account.type,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      }
    });

  } catch (error: any) {
    console.error('Stripe connection test failed:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: "Invalid Stripe secret key. Please check your API key." },
        { status: 401 }
      );
    }

    if (error.type === 'StripePermissionError') {
      return NextResponse.json(
        { error: "Insufficient permissions. Please check your Stripe account settings." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to connect to Stripe" },
      { status: 500 }
    );
  }
}