import { NextRequest, NextResponse } from "next/server";
import { createPaymentLink } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount, description, metadata } = await request.json();

    if (!invoiceId || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields: invoiceId, amount, description" },
        { status: 400 }
      );
    }

    const paymentLink = await createPaymentLink({
      amount,
      description,
      metadata: {
        invoiceId,
        ...metadata,
      },
    });

    return NextResponse.json({
      url: paymentLink.url,
      id: paymentLink.id,
    });
  } catch (error: any) {
    console.error("Error creating payment link:", error.message, error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment link" },
      { status: 500 }
    );
  }
}