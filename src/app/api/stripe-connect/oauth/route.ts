import { NextRequest, NextResponse } from "next/server";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This should contain the userId
    const error = searchParams.get('error');

    // Handle OAuth cancellation
    if (error) {
      console.error('Stripe Connect OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    const userId = state; // We passed userId as the state parameter

    // Exchange the authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_secret: process.env.STRIPE_SECRET_KEY!,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Stripe token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_error=${encodeURIComponent('Failed to connect Stripe account')}`
      );
    }

    const tokenData = await tokenResponse.json();

    // Update user's Stripe Connect information
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_error=${encodeURIComponent('User not found')}`
      );
    }

    // Store the Stripe Connect account information
    await updateDoc(userDocRef, {
      paymentSettings: {
        ...userDoc.data().paymentSettings,
        stripe: {
          accountId: tokenData.stripe_user_id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          publishableKey: tokenData.stripe_publishable_key,
          isActive: true,
          connectedAt: new Date().toISOString(),
        }
      }
    });

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_connected=true`
    );

  } catch (error) {
    console.error('Error in Stripe Connect OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?stripe_error=${encodeURIComponent('Connection failed')}`
    );
  }
}