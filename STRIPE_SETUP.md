# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for your dashboard application.

## 1. Stripe Account Setup

1. **Create a Stripe Account**

   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete the account verification process

2. **Get Your API Keys**
   - Go to [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
   - Copy your **Publishable Key** (starts with `pk_test_` for test mode)
   - Copy your **Secret Key** (starts with `sk_test_` for test mode)

## 2. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Your app URL (for webhook redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Webhook Secret (see step 3)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 3. Webhook Configuration

1. **Install Stripe CLI** (for local development)

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe CLI**

   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```

4. **Copy the webhook signing secret** from the CLI output and add it to your `.env.local`

5. **For production**, set up webhooks in your Stripe Dashboard:
   - Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_link.payment_succeeded`
     - `invoice.payment_succeeded`

## 4. Supported Payment Methods

The integration supports the following payment methods:

### Payment Links (Simple)

- Credit/Debit Cards
- iDEAL (Netherlands)
- SEPA Direct Debit

### Checkout Sessions (Advanced)

- Credit/Debit Cards
- iDEAL
- SEPA Direct Debit
- SOFORT
- Bancontact
- EPS
- Giropay

## 5. Testing Payments

### Test Card Numbers

Use these test card numbers in Stripe test mode:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- **Expired card**: `4000 0000 0000 0069`

### Test iDEAL

Use any bank name and select "Success" for successful payments.

## 6. Production Setup

1. **Switch to Live Mode**

   - In your Stripe Dashboard, toggle to "Live mode"
   - Get your live API keys
   - Update your environment variables

2. **Update Webhook Endpoint**

   - Set up production webhook endpoint
   - Update `NEXT_PUBLIC_APP_URL` to your production domain

3. **Configure Payment Methods**
   - Enable desired payment methods in your Stripe Dashboard
   - Configure country-specific payment methods as needed

## 7. Features Included

✅ **Payment Link Creation** - Simple payment links for invoices  
✅ **Checkout Sessions** - Advanced checkout with multiple payment methods  
✅ **Webhook Handling** - Automatic invoice status updates  
✅ **Payment Validation** - Amount and invoice validation  
✅ **Error Handling** - User-friendly error messages  
✅ **Success/Failure Pages** - Proper redirect handling  
✅ **Multiple Payment Methods** - Cards, iDEAL, SEPA, etc.

## 8. Usage

### Creating Payment Links

1. Go to Dashboard > Payments
2. Click the credit card icon next to an invoice
3. Choose between Payment Link or Checkout Session
4. Share the generated link with your client

### Monitoring Payments

- View payment status in the Payments dashboard
- Invoices automatically update to "paid" when payment is completed
- Webhook events are logged for debugging

## 9. Troubleshooting

### Common Issues

**Webhook not working:**

- Check webhook endpoint URL is correct
- Verify webhook secret is properly set
- Check Stripe CLI is forwarding events correctly

**Payment links not generating:**

- Verify Stripe API keys are correct
- Check environment variables are loaded
- Review browser console for errors

**Payments not updating invoice status:**

- Check webhook events are being received
- Verify webhook secret matches
- Check invoice ID is in payment metadata

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```bash
STRIPE_DEBUG=true
```

## 10. Security Notes

- Never commit your `.env.local` file to version control
- Use test keys during development
- Rotate your API keys regularly
- Monitor webhook events for suspicious activity
- Use HTTPS in production

## Support

For Stripe-specific issues, consult:

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Discord Community](https://discord.gg/stripe)
