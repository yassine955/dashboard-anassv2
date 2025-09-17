import { NextRequest, NextResponse } from "next/server";
import { createMolliePayment } from "@/lib/mollie-server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create Mollie payments." },
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

    // Get user's Mollie configuration
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const mollieSettings = userData.paymentSettings?.mollie;

    if (!mollieSettings?.isActive || !mollieSettings?.apiKey) {
      return NextResponse.json(
        { error: "Mollie is not configured for this user. Please configure Mollie in your settings." },
        { status: 400 }
      );
    }

    // Create Mollie payment
    const result = await createMolliePayment({
      amount,
      description,
      metadata,
      invoiceId,
      clientId,
      mollieSettings: {
        apiKey: mollieSettings.apiKey,
        profileId: mollieSettings.profileId,
      }
    });

    console.log('Mollie Payment result:', result);

    return NextResponse.json({
      url: result.paymentUrl,
      paymentId: result.paymentId,
      type: 'mollie_payment',
    });
  } catch (error: any) {
    console.error("Error creating Mollie payment:", error);

    // Handle specific Mollie API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Mollie authentication failed. Please check your API key." },
        { status: 500 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to Mollie API: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create Mollie payment" },
      { status: 500 }
    );
  }
}