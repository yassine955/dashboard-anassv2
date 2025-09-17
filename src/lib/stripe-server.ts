import Stripe from "stripe"

// Create a Stripe instance with user-specific keys
function createStripeInstance(secretKey: string) {
    return new Stripe(secretKey, {
        apiVersion: "2024-06-20",
    });
}

// Fallback to global Stripe instance for backward compatibility
export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-06-20",
    })
    : null;

// Server-only functions
export async function createPaymentLink({
    amount,
    currency = "eur",
    description,
    metadata = {},
    invoiceId,
    clientId,
    stripeSecretKey,
    stripePublishableKey
}: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    invoiceId: string;
    clientId: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
}) {
    // Use user-specific Stripe instance or fallback to global
    const stripeInstance = stripeSecretKey ? createStripeInstance(stripeSecretKey) : stripe;

    if (!stripeInstance) {
        throw new Error("No Stripe configuration available");
    }

    return stripeInstance.paymentLinks.create({
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: description,
                        description: `Payment for ${description}`,
                    },
                    unit_amount: Math.round(amount * 100), // convert euros → cents
                },
                quantity: 1,
            },
        ] as any, // Type assertion for Stripe API compatibility
        metadata: {
            ...metadata,
            invoiceId,
            clientId,
        },
        after_completion: {
            type: "redirect",
            redirect: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?payment=success&invoice=${invoiceId}`,
            },
        },
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        payment_method_types: ["card", "ideal", "sepa_debit"],
    })
}

// Create a checkout session for more control
export async function createCheckoutSession({
    amount,
    currency = "eur",
    description,
    metadata = {},
    invoiceId,
    clientId,
    successUrl,
    cancelUrl,
    stripeSecretKey,
    stripePublishableKey
}: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    invoiceId: string;
    clientId: string;
    successUrl?: string;
    cancelUrl?: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
}) {
    // Use user-specific Stripe instance or fallback to global
    const stripeInstance = stripeSecretKey ? createStripeInstance(stripeSecretKey) : stripe;

    if (!stripeInstance) {
        throw new Error("No Stripe configuration available");
    }

    return stripeInstance.checkout.sessions.create({
        payment_method_types: ["card", "ideal", "sepa_debit"],
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: {
                        name: description,
                        description: `Payment for ${description}`,
                    },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            },
        ] as any, // Type assertion for Stripe API compatibility
        metadata: {
            ...metadata,
            invoiceId,
            clientId,
        },
        mode: "payment",
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?payment=success&invoice=${invoiceId}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?payment=cancelled&invoice=${invoiceId}`,
        billing_address_collection: "auto",
        allow_promotion_codes: true,
    })
}