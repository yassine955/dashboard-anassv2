import { randomBytes, createSign } from 'crypto';

interface INGPaymentParams {
  amount: number;
  description: string;
  metadata: Record<string, any>;
  invoiceId: string;
  clientId: string;
  ingSettings?: {
    clientId: string;
    clientSecret: string;
    creditorIban: string;
  };
}

interface INGPaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

// ING API Base URLs
const ING_SANDBOX_BASE_URL = 'https://api.sandbox.ing.com';
const ING_PRODUCTION_BASE_URL = 'https://api.ing.com';

// Use sandbox for development
const BASE_URL = process.env.NODE_ENV === 'production'
  ? ING_PRODUCTION_BASE_URL
  : ING_SANDBOX_BASE_URL;

/**
 * Generate OAuth access token for ING API
 */
async function getINGAccessToken(clientId?: string, clientSecret?: string): Promise<string> {
  // Use user-specific credentials or fallback to environment
  const ingClientId = clientId || process.env.ING_CLIENT_ID;
  const ingClientSecret = clientSecret || process.env.ING_CLIENT_SECRET;

  if (!ingClientId || !ingClientSecret) {
    throw new Error('ING credentials not available');
  }

  try {
    const response = await fetch(`${BASE_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${ingClientId}:${ingClientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials&scope=payment-requests:create payment-requests:view',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ING OAuth failed: ${errorData.error_description || response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting ING access token:', error);
    throw error;
  }
}

/**
 * Create a payment request with ING
 */
export async function createINGPayment(params: INGPaymentParams): Promise<INGPaymentResult> {
  try {
    // Get access token using user-specific or global credentials
    const accessToken = await getINGAccessToken(
      params.ingSettings?.clientId,
      params.ingSettings?.clientSecret
    );

    // Generate unique request ID
    const requestId = randomBytes(16).toString('hex');

    // Prepare payment request payload
    const paymentRequest = {
      instructedAmount: {
        amount: params.amount.toFixed(2),
        currency: 'EUR'
      },
      creditorAccount: {
        iban: params.ingSettings?.creditorIban || process.env.ING_CREDITOR_IBAN || 'NL90ABNA0585619023',
      },
      creditorName: process.env.ING_CREDITOR_NAME || 'Your Business Name',
      remittanceInformationUnstructured: params.description,
      endToEndIdentification: params.invoiceId,
      // Redirect URLs
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?provider=ing&invoice=${params.invoiceId}`,
    };

    // Make payment request to ING
    const response = await fetch(`${BASE_URL}/v3/payments/sepa-credit-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Request-ID': requestId,
        'TPP-Redirect-URI': paymentRequest.redirectUrl,
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ING Payment API failed: ${errorData.title || errorData.detail || response.statusText}`);
    }

    const paymentResponse = await response.json();

    return {
      paymentId: paymentResponse.paymentId,
      paymentUrl: paymentResponse._links?.scaRedirect?.href || paymentResponse.redirectUrl,
      status: paymentResponse.transactionStatus || 'RCVD',
    };

  } catch (error) {
    console.error('Error creating ING payment:', error);
    throw error;
  }
}

/**
 * Get payment status from ING
 */
export async function getINGPaymentStatus(paymentId: string): Promise<{
  status: string;
  amount?: number;
  transactionId?: string;
}> {
  try {
    const accessToken = await getINGAccessToken();

    const response = await fetch(`${BASE_URL}/v3/payments/sepa-credit-transfer/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Request-ID': randomBytes(16).toString('hex'),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ING Payment Status API failed: ${errorData.title || response.statusText}`);
    }

    const statusResponse = await response.json();

    return {
      status: statusResponse.transactionStatus,
      amount: parseFloat(statusResponse.instructedAmount?.amount || '0'),
      transactionId: statusResponse.resourceId,
    };

  } catch (error) {
    console.error('Error getting ING payment status:', error);
    throw error;
  }
}

/**
 * Webhook handler for ING payment notifications (if supported)
 */
export function handleINGWebhook(payload: any) {
  // ING webhook implementation would go here
  // This depends on ING's specific webhook format
  console.log('ING Webhook received:', payload);

  // Return processed webhook data
  return {
    paymentId: payload.paymentId,
    status: payload.transactionStatus,
    invoiceId: payload.endToEndIdentification,
  };
}