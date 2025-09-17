import { Client, Environment } from "@paypal/paypal-server-sdk";

interface PayPalPaymentParams {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  invoiceId: string;
  clientId: string;
  paypalSettings?: {
    clientId: string;
    clientSecret: string;
    webhookId?: string;
  };
}

interface PayPalPaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

// PayPal Environment
function getPayPalEnvironment(clientId?: string, clientSecret?: string) {
  const paypalClientId = clientId || process.env.PAYPAL_CLIENT_ID;
  const paypalClientSecret = clientSecret || process.env.PAYPAL_CLIENT_SECRET;

  if (!paypalClientId || !paypalClientSecret) {
    throw new Error('PayPal credentials not available');
  }

  if (process.env.NODE_ENV === 'production') {
    return Environment.Production;
  } else {
    return Environment.Sandbox;
  }
}

// Create PayPal client
function createPayPalClient(clientId?: string, clientSecret?: string) {
  const environment = getPayPalEnvironment(clientId, clientSecret);
  
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId || process.env.PAYPAL_CLIENT_ID!,
      oAuthClientSecret: clientSecret || process.env.PAYPAL_CLIENT_SECRET!
    },
    environment: environment
  });
}

/**
 * Create a payment request with PayPal
 */
export async function createPayPalPayment(params: PayPalPaymentParams): Promise<PayPalPaymentResult> {
  try {
    // Get PayPal client using user-specific or global credentials
    const client = createPayPalClient(
      params.paypalSettings?.clientId,
      params.paypalSettings?.clientSecret
    );

    // For now, we'll return a mock response since the actual implementation
    // would require more complex PayPal API calls
    const mockPaymentId = `paypal_${Date.now()}`;
    
    return {
      paymentId: mockPaymentId,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?provider=paypal&invoice=${params.invoiceId}`,
      status: 'CREATED',
    };

  } catch (error) {
    console.error('Error creating PayPal payment:', error);
    throw error;
  }
}

/**
 * Get payment status from PayPal
 */
export async function getPayPalPaymentStatus(paymentId: string, clientId?: string, clientSecret?: string): Promise<{
  status: string;
  amount?: number;
  transactionId?: string;
}> {
  try {
    // For now, we'll return a mock response
    return {
      status: 'COMPLETED',
      amount: 0,
      transactionId: paymentId,
    };

  } catch (error) {
    console.error('Error getting PayPal payment status:', error);
    throw error;
  }
}

/**
 * Webhook handler for PayPal payment notifications
 */
export function handlePayPalWebhook(payload: any) {
  console.log('PayPal Webhook received:', payload);
  
  // Return processed webhook data
  return {
    paymentId: payload.resource?.id,
    status: payload.resource?.status,
    invoiceId: payload.resource?.purchase_units?.[0]?.custom_id,
  };
}