import { NextRequest, NextResponse } from "next/server";
import { createTikkiePayment } from "@/lib/tikkie-server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create Tikkie payments." },
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

    // Get user's Tikkie configuration
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const tikkieSettings = userData.paymentSettings?.tikkie;

    if (!tikkieSettings?.isActive || !tikkieSettings?.apiKey) {
      return NextResponse.json(
        { error: "Tikkie is not configured for this user. Please configure Tikkie in your settings." },
        { status: 400 }
      );
    }

    // Create Tikkie payment
    const result = await createTikkiePayment({
      amount,
      description,
      metadata,
      invoiceId,
      clientId,
      tikkieSettings: {
        apiKey: tikkieSettings.apiKey,
        sandboxMode: tikkieSettings.sandboxMode,
      }
    });

    console.log('Tikkie Payment result:', result);

    return NextResponse.json({
      url: result.paymentUrl,
      paymentId: result.paymentId,
      type: 'tikkie_payment',
    });
  } catch (error: any) {
    console.error("Error creating Tikkie payment:", error);

    // Handle specific Tikkie API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: "Tikkie authentication failed. Please check your API key." },
        { status: 500 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to Tikkie API: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create Tikkie payment" },
      { status: 500 }
    );
  }
}