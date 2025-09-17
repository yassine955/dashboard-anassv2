import Stripe from "stripe"

// Create a Stripe instance with user-specific keys
function createStripeInstance(secretKey: string, stripeAccountId?: string) {
    const options: Stripe.StripeConfig = {
        apiVersion: "2024-06-20",
    };
    
    // If we have a Stripe Connect account ID, set it in the config
    if (stripeAccountId) {
        options.stripeAccount = stripeAccountId;
    }
    
    return new Stripe(secretKey, options);
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
    stripePublishableKey,
    stripeAccountId
}: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    invoiceId: string;
    clientId: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
    stripeAccountId?: string;
}) {
    // Use user-specific Stripe instance or fallback to global
    const stripeInstance = stripeSecretKey ? createStripeInstance(stripeSecretKey, stripeAccountId) : stripe;

    if (!stripeInstance) {
        throw new Error("No Stripe configuration available");
    }

    // First create a product
    const product = await stripeInstance.products.create({
        name: description,
        description: `Payment for ${description}`,
    });

    // Then create a price for the product
    const price = await stripeInstance.prices.create({
        product: product.id,
        unit_amount: Math.round(amount * 100), // convert euros → cents
        currency: currency,
    });

    const paymentLinkParams: Stripe.PaymentLinkCreateParams = {
        line_items: [
            {
                price: price.id,
                quantity: 1,
            },
        ],
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
    };

    // For payment links, we create them directly without request options
    return stripeInstance.paymentLinks.create(paymentLinkParams);
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
    stripePublishableKey,
    stripeAccountId
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
    stripeAccountId?: string;
}) {
    // Use user-specific Stripe instance or fallback to global
    const stripeInstance = stripeSecretKey ? createStripeInstance(stripeSecretKey, stripeAccountId) : stripe;

    if (!stripeInstance) {
        throw new Error("No Stripe configuration available");
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: description,
                        description: `Payment for ${description}`,
                    },
                    unit_amount: Math.round(amount * 100), // convert euros → cents
                },
                quantity: 1,
            },
        ],
        metadata: {
            ...metadata,
            invoiceId,
            clientId,
        },
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?payment=success&invoice=${invoiceId}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?payment=cancelled&invoice=${invoiceId}`,
        billing_address_collection: "auto",
        allow_promotion_codes: true,
        payment_method_types: ["card", "ideal", "sepa_debit"],
    };

    // For checkout sessions, we create them directly without request options
    return stripeInstance.checkout.sessions.create(sessionParams);
}