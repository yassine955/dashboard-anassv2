interface TikkiePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  invoiceId: string;
  clientId: string;
  tikkieSettings?: {
    apiKey: string;
    sandboxMode?: boolean;
  };
}

interface TikkiePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

// Tikkie API Base URLs
const TIKKIE_SANDBOX_BASE_URL = 'https://api.sandbox.abnamro.com';
const TIKKIE_PRODUCTION_BASE_URL = 'https://api.abnamro.com';

/**
 * Create a payment request with Tikkie
 */
export async function createTikkiePayment(params: TikkiePaymentParams): Promise<TikkiePaymentResult> {
  try {
    // Get Tikkie API key and environment using user-specific or global credentials
    const apiKey = params.tikkieSettings?.apiKey || process.env.TIKKIE_API_KEY;
    const isSandbox = params.tikkieSettings?.sandboxMode || process.env.NODE_ENV !== 'production';
    
    const baseUrl = isSandbox ? TIKKIE_SANDBOX_BASE_URL : TIKKIE_PRODUCTION_BASE_URL;

    if (!apiKey) {
      throw new Error('Tikkie API key not available');
    }

    // Create payment request
    const response = await fetch(`${baseUrl}/v2/tikkie/paymentrequests`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'X-Consumer-Platform': 'Web',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amountInCents: Math.round(params.amount * 100), // Convert to cents
        currency: params.currency?.toUpperCase() || 'EUR',
        description: params.description,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?provider=tikkie&invoice=${params.invoiceId}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/tikkie-webhook`,
        externalId: params.invoiceId,
        metadata: {
          invoiceId: params.invoiceId,
          clientId: params.clientId,
          ...params.metadata,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Tikkie Payment API failed: ${errorData.message || response.statusText}`);
    }

    const payment = await response.json();

    return {
      paymentId: payment.paymentRequestUuid,
      paymentUrl: payment.paymentRequestUrl,
      status: 'OPEN', // Tikkie payment requests start as open
    };

  } catch (error) {
    console.error('Error creating Tikkie payment:', error);
    throw error;
  }
}

/**
 * Get payment status from Tikkie
 */
export async function getTikkiePaymentStatus(paymentId: string, apiKey?: string, isSandbox?: boolean): Promise<{
  status: string;
  amount?: number;
  transactionId?: string;
}> {
  try {
    const tikkieApiKey = apiKey || process.env.TIKKIE_API_KEY;
    const sandboxMode = isSandbox !== undefined ? isSandbox : process.env.NODE_ENV !== 'production';
    
    const baseUrl = sandboxMode ? TIKKIE_SANDBOX_BASE_URL : TIKKIE_PRODUCTION_BASE_URL;

    if (!tikkieApiKey) {
      throw new Error('Tikkie API key not available');
    }

    const response = await fetch(`${baseUrl}/v2/tikkie/paymentrequests/${paymentId}`, {
      method: 'GET',
      headers: {
        'API-Key': tikkieApiKey,
        'X-Consumer-Platform': 'Web',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Tikkie Payment Status API failed: ${errorData.message || response.statusText}`);
    }

    const payment = await response.json();

    // Calculate total amount from payments
    let totalAmount = 0;
    if (payment.payments && payment.payments.length > 0) {
      totalAmount = payment.payments.reduce((sum: number, p: any) => sum + (p.amountInCents / 100), 0);
    }

    return {
      status: payment.status,
      amount: totalAmount,
      transactionId: payment.paymentRequestUuid,
    };

  } catch (error) {
    console.error('Error getting Tikkie payment status:', error);
    throw error;
  }
}

/**
 * Webhook handler for Tikkie payment notifications
 */
export function handleTikkieWebhook(payload: any) {
  console.log('Tikkie Webhook received:', payload);
  
  // Return processed webhook data
  return {
    paymentId: payload.paymentRequestUuid,
    status: payload.status,
    invoiceId: payload.externalId,
  };
}