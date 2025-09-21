import { NextRequest, NextResponse } from "next/server";
import { createSandboxAppToken } from "@/lib/tikkie-server";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to create sandbox app token." },
        { status: 401 }
      );
    }

    const { userId, apiKey } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Verify user exists
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Use provided API key or fallback to environment variable
    const tikkieApiKey = apiKey || process.env.ABN_AMRO_API_KEY;

    if (!tikkieApiKey) {
      return NextResponse.json(
        { error: "API key is required. Please provide it in the request or set ABN_AMRO_API_KEY environment variable." },
        { status: 400 }
      );
    }

    console.log('Creating sandbox app token for user:', userId);

    // Create the sandbox app token
    const tokenResult = await createSandboxAppToken(tikkieApiKey);

    // Update user's Tikkie settings with the new app token
    const userData = userDoc.data();
    const updatedPaymentSettings = {
      ...userData.paymentSettings,
      tikkie: {
        ...userData.paymentSettings?.tikkie,
        apiKey: tikkieApiKey,
        appToken: tokenResult.appToken,
        sandboxMode: true,
        isActive: true,
        appTokenCreatedAt: new Date().toISOString(),
        ...(tokenResult.expiresAt && { appTokenExpiresAt: tokenResult.expiresAt })
      }
    };

    await updateDoc(userDocRef, {
      paymentSettings: updatedPaymentSettings,
      updatedAt: new Date()
    });

    console.log('Sandbox app token saved successfully for user:', userId);

    return NextResponse.json({
      success: true,
      appToken: tokenResult.appToken,
      apiKey: tikkieApiKey,
      message: "Sandbox app token created and saved successfully",
      sandboxMode: true,
      ...(tokenResult.expiresAt && { expiresAt: tokenResult.expiresAt })
    });

  } catch (error: any) {
    console.error("Error creating Tikkie sandbox app token:", error);

    // Handle specific API errors
    if (error.message?.includes('API key not available')) {
      return NextResponse.json(
        { error: "ABN AMRO API key is required but not available." },
        { status: 400 }
      );
    }

    if (error.message?.includes('Sandbox App Token creation failed')) {
      return NextResponse.json(
        { error: "Failed to create sandbox app token. Please check your API key and try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create sandbox app token" },
      { status: 500 }
    );
  }
}