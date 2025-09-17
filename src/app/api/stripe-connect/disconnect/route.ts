import { NextRequest, NextResponse } from "next/server";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { stripe } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user's current Stripe settings
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeAccountId = userData.paymentSettings?.stripe?.accountId;

    if (stripeAccountId && stripe) {
      try {
        // Revoke access to the connected account
        await fetch('https://connect.stripe.com/oauth/deauthorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_secret: process.env.STRIPE_SECRET_KEY!,
            stripe_user_id: stripeAccountId,
          }),
        });
      } catch (error) {
        console.error('Error deauthorizing Stripe account:', error);
        // Continue with local cleanup even if deauthorization fails
      }
    }

    // Remove Stripe settings from user profile
    await updateDoc(userDocRef, {
      paymentSettings: {
        ...userData.paymentSettings,
        stripe: {
          isActive: false,
          accountId: null,
          accessToken: null,
          refreshToken: null,
          publishableKey: null,
          disconnectedAt: new Date().toISOString(),
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Stripe account disconnected successfully"
    });

  } catch (error) {
    console.error('Error disconnecting Stripe account:', error);
    return NextResponse.json(
      { error: "Failed to disconnect Stripe account" },
      { status: 500 }
    );
  }
}