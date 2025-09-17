import { NextRequest, NextResponse } from "next/server";
import { createPayPalPayment } from "@/lib/paypal-server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create PayPal payments." },
        { status: 401 }
      );
    }

    const {
      invoiceId,
      amount,
      description,
      metadata = {},
      clientId,
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

    // Get user's PayPal configuration
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const paypalSettings = userData.paymentSettings?.paypal;

    if (!paypalSettings?.isActive || !paypalSettings?.clientId || !paypalSettings?.clientSecret) {
      return NextResponse.json(
        { error: "PayPal is not configured for this user. Please configure PayPal in your settings." },
        { status: 400 }
      );
    }

    // Create PayPal payment
    const result = await createPayPalPayment({
      amount,
      description,
      metadata,
      invoiceId,
      clientId,
      paypalSettings: {
        clientId: paypalSettings.clientId,
        clientSecret: paypalSettings.clientSecret,
        webhookId: paypalSettings.webhookId,
      }
    });

    console.log('PayPal Payment result:', result);

    return NextResponse.json({
      url: result.paymentUrl,
      paymentId: result.paymentId,
      type: 'paypal_payment',
    });
  } catch (error: any) {
    console.error("Error creating PayPal payment:", error);

    // Handle specific PayPal API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: "PayPal authentication failed. Please check your API credentials." },
        { status: 500 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to PayPal API: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create PayPal payment" },
      { status: 500 }
    );
  }
}