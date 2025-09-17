interface MolliePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  invoiceId: string;
  clientId: string;
  mollieSettings?: {
    apiKey: string;
    profileId?: string;
  };
}

interface MolliePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

/**
 * Create a payment request with Mollie
 */
export async function createMolliePayment(params: MolliePaymentParams): Promise<MolliePaymentResult> {
  try {
    // Get Mollie API key using user-specific or global credentials
    const apiKey = params.mollieSettings?.apiKey || process.env.MOLLIE_API_KEY;

    if (!apiKey) {
      throw new Error('Mollie API key not available');
    }

    // Create payment request
    const response = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: params.currency?.toUpperCase() || 'EUR',
          value: params.amount.toFixed(2),
        },
        description: params.description,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?provider=mollie&invoice=${params.invoiceId}`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/mollie-webhook`,
        metadata: {
          invoiceId: params.invoiceId,
          clientId: params.clientId,
          ...params.metadata,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mollie Payment API failed: ${errorData.detail || errorData.title || response.statusText}`);
    }

    const payment = await response.json();

    return {
      paymentId: payment.id,
      paymentUrl: payment._links?.checkout?.href,
      status: payment.status,
    };

  } catch (error) {
    console.error('Error creating Mollie payment:', error);
    throw error;
  }
}

/**
 * Get payment status from Mollie
 */
export async function getMolliePaymentStatus(paymentId: string, apiKey?: string): Promise<{
  status: string;
  amount?: number;
  transactionId?: string;
}> {
  try {
    const mollieApiKey = apiKey || process.env.MOLLIE_API_KEY;

    if (!mollieApiKey) {
      throw new Error('Mollie API key not available');
    }

    const response = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mollieApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Mollie Payment Status API failed: ${errorData.detail || errorData.title || response.statusText}`);
    }

    const payment = await response.json();

    return {
      status: payment.status,
      amount: parseFloat(payment.amount?.value || '0'),
      transactionId: payment.id,
    };

  } catch (error) {
    console.error('Error getting Mollie payment status:', error);
    throw error;
  }
}

/**
 * Webhook handler for Mollie payment notifications
 */
export function handleMollieWebhook(payload: any) {
  console.log('Mollie Webhook received:', payload);
  
  // Return processed webhook data
  return {
    paymentId: payload.id,
    status: payload.status,
    invoiceId: payload.metadata?.invoiceId,
  };
}