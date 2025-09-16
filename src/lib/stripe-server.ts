import Stripe from "stripe"

// Check if Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set. Please configure Stripe in your .env.local file.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
})

// Server-only functions
export async function createPaymentLink({
    amount,
    currency = "eur",
    description,
    metadata = {},
    invoiceId,
    clientId
}: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    invoiceId: string;
    clientId: string;
}) {
    return stripe.paymentLinks.create({
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
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?payment=success&invoice=${invoiceId}`,
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
    cancelUrl
}: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, any>;
    invoiceId: string;
    clientId: string;
    successUrl?: string;
    cancelUrl?: string;
}) {
    return stripe.checkout.sessions.create({
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
        success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?payment=success&invoice=${invoiceId}`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?payment=cancelled&invoice=${invoiceId}`,
        billing_address_collection: "auto",
        allow_promotion_codes: true,
    })
}