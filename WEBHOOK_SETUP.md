# Stripe Webhook Setup Guide

This guide will help you set up Stripe webhooks so that invoice statuses are automatically updated to "betaald" (paid) after successful payments.

## 🚨 **Current Issue**

After making a payment with Stripe, the invoice status is not automatically updating to "paid". This is because webhooks need to be properly configured.

## 🔧 **Solution 1: Set Up Stripe CLI (Recommended for Development)**

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe

```bash
stripe login
```

### 3. Forward webhooks to your local server

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### 4. Copy the webhook signing secret

The CLI will output something like:

```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

### 5. Add the webhook secret to your .env.local

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

### 6. Restart your development server

```bash
npm run dev
```

## 🧪 **Testing the Webhook**

### Method 1: Test with a real payment

1. Create a payment link for an invoice
2. Use test card: `4242 4242 4242 4242`
3. Complete the payment
4. Check if the invoice status updates to "paid"

### Method 2: Test webhook manually

```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "your-invoice-id"}'
```

## 🌐 **Production Setup**

### 1. Set up webhook endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_link.payment_succeeded`
   - `invoice.payment_succeeded`

### 2. Copy the webhook signing secret

1. Click on your webhook endpoint
2. Copy the "Signing secret"
3. Add it to your production environment variables

## 🔍 **Debugging Webhook Issues**

### Check webhook status

Visit: `http://localhost:3000/api/stripe-status`

### Check webhook logs

```bash
# If using Stripe CLI
stripe logs tail
```

### Manual invoice update (for testing)

```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "your-invoice-id"}'
```

## 📋 **Webhook Events We Handle**

1. **`checkout.session.completed`** - When a checkout session is completed
2. **`payment_intent.succeeded`** - When a payment intent succeeds
3. **`payment_link.payment_succeeded`** - When a payment link payment succeeds
4. **`invoice.payment_succeeded`** - When a Stripe invoice payment succeeds

## 🎯 **Expected Behavior**

After successful payment:

1. ✅ Customer is redirected to success page
2. ✅ Success page automatically marks invoice as "paid"
3. ✅ Webhook also marks invoice as "paid" (backup)
4. ✅ Invoice status shows "Betaald" in dashboard
5. ✅ Revenue statistics update automatically

## 🚨 **Troubleshooting**

### Webhook not working?

- Check if `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify webhook endpoint URL is correct
- Check Stripe CLI is running and forwarding events

### Invoice not updating?

- Check browser console for errors
- Verify invoice ID is in payment metadata
- Check Firebase permissions

### Payment link not redirecting?

- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check redirect URLs in Stripe configuration

## 📞 **Support**

If you're still having issues:

1. Check the browser console for errors
2. Check the terminal where `npm run dev` is running
3. Check Stripe CLI logs if using webhooks locally
4. Verify all environment variables are set correctly

The webhook setup is crucial for automatic invoice status updates. Without it, you'll need to manually mark invoices as paid after receiving payments.

stripe listen --forward-to localhost:3000/api/stripe-webhook
