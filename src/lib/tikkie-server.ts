import { getABNAMROAccessToken } from './abn-amro-auth';

interface TikkiePaymentParams {
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  invoiceId: string;
  clientId: string;
  tikkieSettings?: {
    apiKey: string;
    appToken: string;
    sandboxMode?: boolean;
  };
}

interface TikkiePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

// Tikkie API Base URLs
const TIKKIE_SANDBOX_BASE_URL = 'https://api-sandbox.abnamro.com';
const TIKKIE_PRODUCTION_BASE_URL = 'https://api.abnamro.com';

/**
 * Create a payment request with Tikkie
 */
export async function createTikkiePayment(params: TikkiePaymentParams): Promise<TikkiePaymentResult> {
  try {
    // Get Tikkie credentials and environment using user-specific or global credentials
    const apiKey = params.tikkieSettings?.apiKey || process.env.ABN_AMRO_API_KEY;
    const appToken = params.tikkieSettings?.appToken;
    const isSandbox = params.tikkieSettings?.sandboxMode || process.env.NODE_ENV !== 'production';

    const baseUrl = isSandbox ? TIKKIE_SANDBOX_BASE_URL : TIKKIE_PRODUCTION_BASE_URL;

    if (!apiKey) {
      throw new Error('ABN AMRO API key not available');
    }

    if (!appToken) {
      throw new Error('Tikkie App Token not available. Please configure App Token in settings.');
    }

    // For sandbox, we don't need OAuth Bearer token, just API-Key and X-App-Token
    const headers: Record<string, string> = {
      'API-Key': apiKey,
      'X-App-Token': appToken,
      'Content-Type': 'application/json',
    };

    // Only add OAuth Bearer token for production environment
    if (!isSandbox) {
      const accessToken = await getABNAMROAccessToken(isSandbox);
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Create payment request
    const response = await fetch(`${baseUrl}/v2/tikkie/paymentrequests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amountInCents: Math.round(params.amount * 100), // Convert to cents
        description: params.description,
        referenceId: params.invoiceId, // Use referenceId instead of externalId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Tikkie Payment API failed: ${errorData.message || response.statusText}`);
    }

    const payment = await response.json();

    return {
      paymentId: payment.paymentRequestToken,
      paymentUrl: payment.url,
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
export async function getTikkiePaymentStatus(paymentId: string, apiKey?: string, appToken?: string, isSandbox?: boolean): Promise<{
  status: string;
  amount?: number;
  transactionId?: string;
}> {
  try {
    const tikkieApiKey = apiKey || process.env.ABN_AMRO_API_KEY;
    const sandboxMode = isSandbox !== undefined ? isSandbox : process.env.NODE_ENV !== 'production';

    const baseUrl = sandboxMode ? TIKKIE_SANDBOX_BASE_URL : TIKKIE_PRODUCTION_BASE_URL;

    if (!tikkieApiKey) {
      throw new Error('ABN AMRO API key not available');
    }

    if (!appToken) {
      throw new Error('Tikkie App Token not available');
    }

    // For sandbox, we don't need OAuth Bearer token, just API-Key and X-App-Token
    const headers: Record<string, string> = {
      'API-Key': tikkieApiKey,
      'X-App-Token': appToken,
      'Content-Type': 'application/json',
    };

    // Only add OAuth Bearer token for production environment
    if (!sandboxMode) {
      const accessToken = await getABNAMROAccessToken(sandboxMode);
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${baseUrl}/v2/tikkie/paymentrequests/${paymentId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Tikkie Payment Status API failed: ${errorData.message || response.statusText}`);
    }

    const payment = await response.json();

    console.log('Tikkie Payment Status Response:', JSON.stringify(payment, null, 2));

    // Calculate total amount from payments
    let totalAmount = 0;
    if (payment.payments && payment.payments.length > 0) {
      totalAmount = payment.payments.reduce((sum: number, p: any) => sum + (p.amountInCents / 100), 0);
    } else if (payment.totalAmountPaidInCents) {
      // Use totalAmountPaidInCents if available
      totalAmount = payment.totalAmountPaidInCents / 100;
    }

    return {
      status: payment.status,
      amount: totalAmount,
      transactionId: payment.paymentRequestToken,
    };

  } catch (error) {
    console.error('Error getting Tikkie payment status:', error);
    throw error;
  }
}

/**
 * Create a sandbox App Token for Tikkie (sandbox only)
 * This function calls the ABN AMRO API to create a sandbox app token
 * which is required before making payment requests in sandbox mode
 */
export async function createSandboxAppToken(apiKey?: string): Promise<{
  appToken: string;
  expiresAt?: string;
}> {
  try {
    const tikkieApiKey = apiKey || process.env.ABN_AMRO_API_KEY;

    if (!tikkieApiKey) {
      throw new Error('ABN AMRO API key not available');
    }

    // Create sandbox app token
    const response = await fetch(`${TIKKIE_SANDBOX_BASE_URL}/v2/tikkie/sandboxapps`, {
      method: 'POST',
      headers: {
        'API-Key': tikkieApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tikkie Sandbox App Token creation failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();

    if (!result.appToken) {
      throw new Error('No app token received from Tikkie API');
    }

    console.log('Sandbox App Token created successfully');

    return {
      appToken: result.appToken,
      expiresAt: result.expiresAt,
    };

  } catch (error) {
    console.error('Error creating Tikkie sandbox app token:', error);
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
    paymentId: payload.paymentRequestToken,
    status: payload.status,
    invoiceId: payload.referenceId,
  };
}