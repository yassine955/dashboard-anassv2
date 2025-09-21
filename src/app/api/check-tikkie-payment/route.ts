import { NextRequest, NextResponse } from "next/server";
import { getTikkiePaymentStatus } from "@/lib/tikkie-server";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to check payment status." },
        { status: 401 }
      );
    }

    const {
      paymentId,
      invoiceId,
      userId
    } = await request.json();

    if (!paymentId || !invoiceId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: paymentId, invoiceId, userId" },
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

    if (!tikkieSettings?.isActive || !tikkieSettings?.apiKey || !tikkieSettings?.appToken) {
      return NextResponse.json(
        { error: "Tikkie is not configured for this user. Please configure both API Key and App Token in your settings." },
        { status: 400 }
      );
    }

    // Check payment status with Tikkie API
    const paymentStatus = await getTikkiePaymentStatus(
      paymentId,
      tikkieSettings.apiKey,
      tikkieSettings.appToken,
      tikkieSettings.sandboxMode
    );

    console.log(`Tikkie payment status check for ${paymentId}:`, paymentStatus);

    // Get current invoice data
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      return NextResponse.json(
        { error: "Invoice not found." },
        { status: 404 }
      );
    }

    const invoiceData = invoiceDoc.data();
    console.log(`Current invoice status: ${invoiceData.status}, API status: ${paymentStatus.status}`);
    let newStatus = invoiceData.status;
    let paidAt = invoiceData.paidAt;
    let shouldUpdate = false;

    // Map Tikkie payment status to invoice status
    // Check if payment has been made even if status is still OPEN (sandbox behavior)
    if ((paymentStatus.status === 'PAID') || (paymentStatus.status === 'OPEN' && paymentStatus.amount > 0)) {
      if (invoiceData.status !== 'paid') {
        newStatus = 'paid';
        paidAt = new Date();
        shouldUpdate = true;
        console.log('Payment detected! Amount paid:', paymentStatus.amount);
      }
    } else {
      switch (paymentStatus.status) {
        case 'CANCELLED':
        case 'EXPIRED':
          if (invoiceData.status !== 'cancelled') {
            newStatus = 'cancelled';
            shouldUpdate = true;
          }
          break;
        case 'OPEN':
          if (invoiceData.status !== 'sent') {
            newStatus = 'sent';
            shouldUpdate = true;
          }
          break;
        default:
          console.log('Unknown Tikkie payment status:', paymentStatus.status);
          break;
      }
    }

    console.log(`Should update invoice? ${shouldUpdate}, New status: ${newStatus}`);

    // Update invoice if status changed
    if (shouldUpdate) {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
        paymentProvider: 'tikkie',
        paymentId: paymentId,
      };

      if (paidAt) {
        updateData.paidAt = paidAt;
      }

      if (paymentStatus.amount) {
        updateData.paidAmount = paymentStatus.amount;
      }

      await updateDoc(invoiceRef, updateData);

      console.log(`Invoice ${invoiceId} status updated to ${newStatus} via polling`);
    }

    return NextResponse.json({
      success: true,
      paymentStatus: paymentStatus.status,
      invoiceStatus: newStatus,
      amount: paymentStatus.amount,
      updated: shouldUpdate,
      transactionId: paymentStatus.transactionId
    });

  } catch (error: any) {
    console.error("Error checking Tikkie payment status:", error);

    // Handle specific API errors
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: "Payment not found or invalid payment ID." },
        { status: 404 }
      );
    }

    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: "Tikkie authentication failed. Please check your API key." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to check payment status" },
      { status: 500 }
    );
  }
}