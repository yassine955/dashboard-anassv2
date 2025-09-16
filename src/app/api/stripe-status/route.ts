import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    const status = {
        stripeConfigured: false,
        missingVariables: [] as string[],
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
    };

    // Check required Stripe environment variables
    const requiredVars = [
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    ];

    const optionalVars = [
        'NEXT_PUBLIC_APP_URL',
        'STRIPE_WEBHOOK_SECRET',
    ];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            status.missingVariables.push(varName);
        }
    }

    status.stripeConfigured = status.missingVariables.length === 0;

    return NextResponse.json(status);
}
