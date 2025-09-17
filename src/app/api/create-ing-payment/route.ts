import { NextRequest, NextResponse } from "next/server";
import { createINGPayment } from "@/lib/ing-server";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create ING payments." },
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

    // Get user's ING configuration
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const ingSettings = userData.paymentSettings?.ing;

    if (!ingSettings?.isActive || !ingSettings?.clientId || !ingSettings?.clientSecret || !ingSettings?.creditorIban) {
      return NextResponse.json(
        { error: "ING is not configured for this user. Please configure ING in your settings." },
        { status: 400 }
      );
    }

    // Create ING payment
    const result = await createINGPayment({
      amount,
      description,
      metadata,
      invoiceId,
      clientId,
      ingSettings: {
        clientId: ingSettings.clientId,
        clientSecret: ingSettings.clientSecret,
        creditorIban: ingSettings.creditorIban,
      }
    });

    console.log('ING Payment result:', result);

    return NextResponse.json({
      url: result.paymentUrl,
      paymentId: result.paymentId,
      type: 'ing_payment',
    });
  } catch (error: any) {
    console.error("Error creating ING payment:", error);

    // Handle specific ING API errors
    if (error.status === 401) {
      return NextResponse.json(
        { error: "ING authentication failed. Please check your API credentials." },
        { status: 500 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to ING API: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create ING payment" },
      { status: 500 }
    );
  }
}