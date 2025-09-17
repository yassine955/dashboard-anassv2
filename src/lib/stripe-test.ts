import { createPaymentLink } from '../lib/stripe-server';

// Test the createPaymentLink function
async function testCreatePaymentLink() {
  try {
    const result = await createPaymentLink({
      amount: 100,
      currency: 'eur',
      description: 'Test Payment',
      invoiceId: 'test-invoice-123',
      clientId: 'test-client-456'
    });
    
    console.log('Payment link created successfully:', result);
    return result;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

// Run the test
testCreatePaymentLink().then(() => {
  console.log('Test completed successfully');
}).catch((error) => {
  console.error('Test failed:', error);
});