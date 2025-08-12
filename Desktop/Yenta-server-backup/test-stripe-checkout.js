const fetch = require('node-fetch');

async function testStripeCheckout() {
  console.log('🧪 Testing Stripe Checkout Session Creation...\n');
  
  const API_URL = 'http://localhost:3001/api';
  
  // Test data
  const testData = {
    meeting_id: 1,
    amount: "2500.00",
    success_url: "http://localhost:3004/payment-success?meeting_id=1",
    cancel_url: "http://localhost:3004/meetings/1"
  };
  
  // Note: In real usage, you'd get this token from authentication
  // For testing, you might need to login first or use a valid token
  const authToken = 'test-token'; // Replace with actual token
  
  try {
    console.log('📤 Sending request to create checkout session...');
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(`${API_URL}/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(testData)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Success! Checkout session created');
      console.log('Response:', JSON.stringify(responseData, null, 2));
      
      if (responseData.checkout_url) {
        console.log('\n🔗 Checkout URL:', responseData.checkout_url);
        console.log('\n📋 To complete the test:');
        console.log('1. Open the URL above in your browser');
        console.log('2. Use test card: 4242 4242 4242 4242');
        console.log('3. Use any future expiry date and any CVC');
        console.log('4. Complete the payment');
        console.log('5. You should be redirected to the success page');
      }
    } else {
      console.log('\n❌ Error:', response.status, response.statusText);
      console.log('Response:', JSON.stringify(responseData, null, 2));
      
      if (response.status === 401) {
        console.log('\n⚠️  Note: You need a valid authentication token.');
        console.log('First login as a vendor to get a token, then update the authToken variable.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.log('\n⚠️  Make sure:');
    console.log('- The server is running on port 3001');
    console.log('- Stripe keys are configured in .env');
    console.log('- You have a valid auth token');
  }
}

// Run the test
testStripeCheckout();

console.log('\n📝 Additional test commands:');
console.log('\n1. Test webhook locally:');
console.log('   stripe trigger payment_intent.succeeded');
console.log('\n2. View webhook events:');
console.log('   stripe logs tail');
console.log('\n3. Test with curl:');
console.log(`   curl -X POST http://localhost:3001/api/payments/create-checkout-session \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer YOUR_TOKEN" \\
     -d '{
       "meeting_id": 1,
       "amount": "2500.00",
       "success_url": "http://localhost:3004/payment-success?meeting_id=1",
       "cancel_url": "http://localhost:3004/meetings/1"
     }'`);