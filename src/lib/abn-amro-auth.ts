import jwt from 'jsonwebtoken';

interface ABNAMROTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

// In-memory token cache
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Generate a JWT for ABN AMRO authentication
 */
function generateJWT(): string {
  const privateKey = process.env.ABN_AMRO_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('ABN AMRO private key not configured in environment variables');
  }

  const payload = {
    iss: process.env.ABN_AMRO_API_KEY, // Issuer (your API key)
    sub: process.env.ABN_AMRO_API_KEY, // Subject (your API key)
    aud: 'https://auth-sandbox.abnamro.com', // Audience (ABN AMRO auth server)
    exp: Math.floor(Date.now() / 1000) + (5 * 60), // Expires in 5 minutes
    iat: Math.floor(Date.now() / 1000), // Issued at
    jti: generateUUID() // Unique JWT ID
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      alg: 'RS256',
      typ: 'JWT'
    }
  });
}

/**
 * Generate a unique UUID for JWT ID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get an access token from ABN AMRO
 */
export async function getABNAMROAccessToken(isSandbox: boolean = true): Promise<string> {
  const cacheKey = `abn_amro_${isSandbox ? 'sandbox' : 'production'}`;

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  try {
    // Generate JWT
    const jwtToken = generateJWT();

    // Exchange JWT for access token
    const authUrl = isSandbox
      ? 'https://auth-sandbox.abnamro.com/oauth/token'
      : 'https://auth.abnamro.com/oauth/token';

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: jwtToken,
        scope: 'tikkie'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ABN AMRO OAuth error:', response.status, errorText);
      throw new Error(`ABN AMRO authentication failed: ${response.status} ${response.statusText}`);
    }

    const tokenResponse: ABNAMROTokenResponse = await response.json();

    // Cache the token (expire it 1 minute before actual expiry for safety)
    const expiresAt = Date.now() + ((tokenResponse.expires_in - 60) * 1000);
    tokenCache.set(cacheKey, {
      token: tokenResponse.access_token,
      expiresAt
    });

    return tokenResponse.access_token;

  } catch (error) {
    console.error('Error getting ABN AMRO access token:', error);
    throw error;
  }
}

/**
 * Clear cached tokens (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Validate that all required environment variables are set
 */
export function validateABNAMROConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.ABN_AMRO_API_KEY) {
    errors.push('ABN_AMRO_API_KEY environment variable is required');
  }

  if (!process.env.ABN_AMRO_PRIVATE_KEY) {
    errors.push('ABN_AMRO_PRIVATE_KEY environment variable is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}