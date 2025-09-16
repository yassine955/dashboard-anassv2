"use server"

import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
})

// Server-only functions
export async function createPaymentLink({ amount, currency = "eur", description, metadata = {} }) {
    return stripe.paymentLinks.create({
        line_items: [
            {
                price_data: {
                    currency,
                    product_data: { name: description },
                    unit_amount: Math.round(amount * 100), // convert euros → cents
                },
                quantity: 1,
            },
        ],
        metadata,
        after_completion: {
            type: "redirect",
            redirect: {
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments?payment=success`,
            },
        },
    })
}