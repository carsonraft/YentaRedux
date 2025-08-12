#!/bin/bash

echo "🚀 Starting Stripe webhook forwarding to localhost:3001..."
echo "This will forward all Stripe events to your local server"
echo ""
echo "📌 Important: Keep this terminal open while testing payments"
echo ""

# Start forwarding webhooks to your local server
stripe listen --forward-to localhost:3001/api/payments/webhook

# Note: The webhook signing secret will be displayed when you run this command
# Copy it and add it to your .env file as STRIPE_WEBHOOK_SECRET