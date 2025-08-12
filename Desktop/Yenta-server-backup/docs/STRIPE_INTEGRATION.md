# Stripe Integration Guide for Yenta

## Overview
Yenta uses Stripe for processing payments related to qualified AI meetings between vendors and prospects. The platform supports both Payment Intents (custom UI) and Checkout Sessions (hosted by Stripe).

## Current Implementation

### Backend Endpoints

1. **Create Checkout Session** (Recommended)
   - Endpoint: `POST /api/payments/create-checkout-session`
   - Creates a Stripe-hosted checkout page
   - Handles all payment UI and compliance
   - Example usage:
   ```javascript
   const response = await fetch('/api/payments/create-checkout-session', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     },
     body: JSON.stringify({
       meeting_id: 123,
       amount: "2500.00",
       success_url: "http://localhost:3004/payment-success?meeting_id=123",
       cancel_url: "http://localhost:3004/meetings/123"
     })
   });
   
   const { checkout_url } = await response.json();
   window.location.href = checkout_url; // Redirect to Stripe
   ```

2. **Create Payment Intent** (For custom UI)
   - Endpoint: `POST /api/payments/create-payment-intent`
   - Returns client secret for Stripe Elements
   - Requires custom payment form implementation

3. **Webhook Handler**
   - Endpoint: `POST /api/payments/webhook`
   - Processes Stripe events (payment success/failure)
   - Updates meeting payment status automatically

### Frontend Components

1. **StripeCheckout Component** (`/client/src/components/payments/StripeCheckout.tsx`)
   - Simple button that redirects to Stripe Checkout
   - Handles loading states and errors
   - Usage:
   ```tsx
   <StripeCheckout
     meetingId={123}
     amount={2500}
     vendorCompany="AI Solutions Inc"
     prospectCompany="Tech Corp"
   />
   ```

2. **PaymentSuccess Page** (`/client/src/components/payments/PaymentSuccess.tsx`)
   - Success page after payment completion
   - Verifies payment status
   - Provides return to dashboard option

## Payment Flow

1. **Vendor initiates payment** for a qualified meeting
2. **System creates Checkout Session** with meeting details
3. **User redirected to Stripe** for secure payment
4. **Stripe processes payment** and redirects back
5. **Webhook updates** meeting status to "paid"
6. **Success page** confirms payment

## Testing

Use these test card numbers in Stripe's test mode:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## Configuration Required

1. **Webhook Endpoint**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

2. **Environment Variables**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Fee Structure

- **Initial Consultation**: $2,500
- **Qualified Lead Bonus**: $5,000
- **MDF Transaction Fee**: 3-5%

## Security Considerations

- Never expose secret keys in frontend code
- Always verify webhook signatures
- Use HTTPS in production
- Store payment records for audit trails

## Next Steps

1. Set up webhook endpoint in Stripe dashboard
2. Test the full payment flow
3. Add payment analytics to vendor dashboard
4. Consider implementing subscription plans

## Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)