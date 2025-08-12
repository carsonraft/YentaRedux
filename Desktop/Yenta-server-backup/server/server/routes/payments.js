const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create payment intent for meeting
router.post('/create-payment-intent', authenticateToken, requireRole(['vendor']), [
  body('meeting_id').isInt(),
  body('amount').isDecimal({ decimal_digits: '2' })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { meeting_id, amount } = req.body;

    // Verify vendor owns this meeting
    const meetingResult = await db.query(
      `SELECT m.*, v.company_name as vendor_company, p.company_name as prospect_company
       FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       JOIN prospects p ON m.prospect_id = p.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [meeting_id, req.user.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found or access denied' } });
    }

    const meeting = meetingResult.rows[0];

    // Check if payment already exists
    if (meeting.stripe_payment_id) {
      return res.status(400).json({ error: { message: 'Payment already exists for this meeting' } });
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        meeting_id: meeting_id.toString(),
        vendor_company: meeting.vendor_company,
        prospect_company: meeting.prospect_company
      },
      description: `Meeting payment: ${meeting.vendor_company} + ${meeting.prospect_company}`
    });

    // Update meeting with payment info
    await db.query(
      `UPDATE meetings SET 
       payment_amount = $1,
       stripe_payment_id = $2,
       payment_status = 'pending',
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, paymentIntent.id, meeting_id]
    );

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: { message: 'Failed to create payment intent' } });
  }
});

// Confirm payment completion
router.post('/confirm-payment', authenticateToken, requireRole(['vendor']), [
  body('payment_intent_id').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { payment_intent_id } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: { message: 'Payment not successful' } });
    }

    // Update meeting payment status
    const result = await db.query(
      `UPDATE meetings SET 
       payment_status = 'paid',
       updated_at = CURRENT_TIMESTAMP
       WHERE stripe_payment_id = $1
       RETURNING *`,
      [payment_intent_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    res.json({
      message: 'Payment confirmed successfully',
      meeting: result.rows[0]
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: { message: 'Failed to confirm payment' } });
  }
});

// Webhook endpoint for Stripe events (exported separately to handle raw body)
const webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update meeting payment status
      try {
        await db.query(
          `UPDATE meetings SET 
           payment_status = 'paid',
           updated_at = CURRENT_TIMESTAMP
           WHERE stripe_payment_id = $1`,
          [paymentIntent.id]
        );
        
        console.log(`Payment succeeded for PaymentIntent: ${paymentIntent.id}`);
      } catch (error) {
        console.error('Error updating payment status:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      try {
        await db.query(
          `UPDATE meetings SET 
           payment_status = 'failed',
           updated_at = CURRENT_TIMESTAMP
           WHERE stripe_payment_id = $1`,
          [failedPayment.id]
        );
        
        console.log(`Payment failed for PaymentIntent: ${failedPayment.id}`);
      } catch (error) {
        console.error('Error updating failed payment status:', error);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

// Refund payment for meeting
router.post('/refund', authenticateToken, requireRole(['admin']), [
  body('meeting_id').isInt(),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { meeting_id, reason } = req.body;

    // Get meeting with payment info
    const meetingResult = await db.query(
      'SELECT * FROM meetings WHERE id = $1 AND payment_status = $2',
      [meeting_id, 'paid']
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Paid meeting not found' } });
    }

    const meeting = meetingResult.rows[0];

    if (!meeting.stripe_payment_id) {
      return res.status(400).json({ error: { message: 'No payment ID found for meeting' } });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: meeting.stripe_payment_id,
      reason: 'requested_by_customer',
      metadata: {
        meeting_id: meeting_id.toString(),
        refund_reason: reason || 'Admin refund'
      }
    });

    // Update meeting status
    await db.query(
      `UPDATE meetings SET 
       payment_status = 'refunded',
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [meeting_id]
    );

    res.json({
      message: 'Refund processed successfully',
      refund_id: refund.id,
      amount_refunded: refund.amount / 100
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ error: { message: 'Failed to process refund' } });
  }
});

// Get payment history for vendor
router.get('/history', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await db.query(
      `SELECT m.id, m.payment_amount, m.payment_status, m.stripe_payment_id,
              m.scheduled_at, m.created_at,
              p.company_name as prospect_company, p.contact_name
       FROM meetings m
       JOIN prospects p ON m.prospect_id = p.id
       WHERE m.vendor_id = $1 AND m.payment_amount > 0
       ORDER BY m.created_at DESC`,
      [vendorId]
    );

    res.json({ payments: result.rows });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: { message: 'Failed to get payment history' } });
  }
});

// Get payment analytics for vendor
router.get('/analytics', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_meetings_with_payment,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_meetings,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN payment_status = 'refunded' THEN 1 END) as refunded_payments,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN payment_amount END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN payment_status = 'paid' THEN payment_amount END), 0) as avg_payment
       FROM meetings 
       WHERE vendor_id = $1 AND payment_amount > 0`,
      [vendorId]
    );

    res.json({ analytics: result.rows[0] });

  } catch (error) {
    console.error('Get payment analytics error:', error);
    res.status(500).json({ error: { message: 'Failed to get payment analytics' } });
  }
});

// Create checkout session for meeting (alternative to payment intent)
router.post('/create-checkout-session', authenticateToken, requireRole(['vendor']), [
  body('meeting_id').isInt(),
  body('amount').isDecimal({ decimal_digits: '2' }),
  body('success_url').isURL(),
  body('cancel_url').isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { meeting_id, amount, success_url, cancel_url } = req.body;

    // Verify vendor owns this meeting
    const meetingResult = await db.query(
      `SELECT m.*, v.company_name as vendor_company, p.company_name as prospect_company
       FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       JOIN prospects p ON m.prospect_id = p.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [meeting_id, req.user.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found or access denied' } });
    }

    const meeting = meetingResult.rows[0];
    const amountCents = Math.round(parseFloat(amount) * 100);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Qualified AI Meeting',
            description: `${meeting.vendor_company} + ${meeting.prospect_company}`
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        meeting_id: meeting_id.toString(),
        vendor_company: meeting.vendor_company,
        prospect_company: meeting.prospect_company
      }
    });

    // Update meeting with session info
    await db.query(
      `UPDATE meetings SET 
       payment_amount = $1,
       stripe_payment_id = $2,
       payment_status = 'pending',
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, session.payment_intent, meeting_id]
    );

    res.json({
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: { message: 'Failed to create checkout session' } });
  }
});

module.exports = router;
module.exports.webhook = webhookHandler;