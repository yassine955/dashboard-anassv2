import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Generate the Stripe Connect OAuth URL
    const clientId = process.env.STRIPE_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!clientId) {
      return NextResponse.json(
        { error: "Stripe Connect not configured. Missing STRIPE_CLIENT_ID." },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      state: userId, // Pass userId as state to get it back in the callback
      scope: 'read_write',
      response_type: 'code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe-connect/oauth`,
    });

    const authorizeUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.json({
      authorizeUrl
    });

  } catch (error) {
    console.error('Error generating Stripe Connect URL:', error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}