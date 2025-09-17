// Stripe integration test utilities
// This file can be used to test Stripe functionality

import { stripe } from './stripe-server';

export async function testStripeConnection() {
    if (!stripe) {
        console.error('❌ Stripe not configured - missing secret key');
        return { success: false, error: 'Stripe not configured' };
    }

    try {
        // Test basic Stripe API connection
        const account = await stripe.accounts.retrieve();
        console.log('✅ Stripe connection successful');
        console.log('Account ID:', account.id);
        console.log('Account Type:', account.type);
        return { success: true, account };
    } catch (error) {
        console.error('❌ Stripe connection failed:', error);
        return { success: false, error };
    }
}

export async function testPaymentLinkCreation() {
    if (!stripe) {
        console.error('❌ Stripe not configured - missing secret key');
        return { success: false, error: 'Stripe not configured' };
    }

    try {
        const testAmount = 10.00; // €10.00
        const testDescription = 'Test Payment Link';

        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: testDescription,
                        },
                        unit_amount: Math.round(testAmount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ] as any,
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: 'https://example.com/success',
                },
            },
        });

        console.log('✅ Payment link created successfully');
        console.log('Payment Link URL:', paymentLink.url);
        console.log('Payment Link ID:', paymentLink.id);

        return { success: true, paymentLink };
    } catch (error) {
        console.error('❌ Payment link creation failed:', error);
        return { success: false, error };
    }
}

export async function testCheckoutSessionCreation() {
    if (!stripe) {
        console.error('❌ Stripe not configured - missing secret key');
        return { success: false, error: 'Stripe not configured' };
    }

    try {
        const testAmount = 15.00; // €15.00
        const testDescription = 'Test Checkout Session';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: testDescription,
                        },
                        unit_amount: Math.round(testAmount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ] as any,
            mode: 'payment',
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });

        console.log('✅ Checkout session created successfully');
        console.log('Session URL:', session.url);
        console.log('Session ID:', session.id);

        return { success: true, session };
    } catch (error) {
        console.error('❌ Checkout session creation failed:', error);
        return { success: false, error };
    }
}

// Run all tests
export async function runAllStripeTests() {
    console.log('🧪 Running Stripe integration tests...\n');

    const connectionTest = await testStripeConnection();
    console.log('');

    const paymentLinkTest = await testPaymentLinkCreation();
    console.log('');

    const checkoutTest = await testCheckoutSessionCreation();
    console.log('');

    const allPassed = connectionTest.success && paymentLinkTest.success && checkoutTest.success;

    if (allPassed) {
        console.log('🎉 All Stripe tests passed!');
    } else {
        console.log('⚠️  Some Stripe tests failed. Check the errors above.');
    }

    return {
        connectionTest,
        paymentLinkTest,
        checkoutTest,
        allPassed,
    };
}
