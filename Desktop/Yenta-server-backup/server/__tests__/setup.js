require('dotenv').config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'yenta_test_db';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test_openai_key';

// Mock external services for testing
jest.mock('../services/openai', () => ({
  startConversation: jest.fn().mockResolvedValue([
    { role: 'system', content: 'Test system message' },
    { role: 'assistant', content: 'Test greeting' }
  ]),
  continueConversation: jest.fn().mockResolvedValue({
    messages: [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Test response' }
    ],
    response: 'Test response'
  }),
  scoreReadiness: jest.fn().mockResolvedValue({
    budget_score: 20,
    use_case_score: 20,
    timeline_score: 20,
    technical_score: 20,
    total_score: 80,
    category: 'HOT',
    evidence: ['Test evidence'],
    summary: 'Test summary'
  }),
  extractProjectDetails: jest.fn().mockResolvedValue({
    industry: 'Technology',
    use_case: 'AI chatbot',
    budget_range: '$50k-$100k',
    timeline: '3 months'
  }),
  matchVendors: jest.fn().mockResolvedValue([
    {
      vendor_id: 1,
      match_score: 85,
      reasons: ['Great fit for use case'],
      concerns: [],
      talking_points: ['Discuss chatbot features']
    }
  ])
}));

jest.mock('../services/email', () => ({
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(true),
  sendHotProspectAlert: jest.fn().mockResolvedValue(true),
  sendMDFBudgetAlert: jest.fn().mockResolvedValue(true),
  sendPaymentConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendMeetingReminderEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/invoice', () => ({
  generateMDFInvoice: jest.fn().mockResolvedValue({
    invoice_number: 'INV-202501-0001',
    invoice_url: '/api/invoices/INV-202501-0001.html',
    invoice_html: '<html>Test invoice</html>'
  }),
  generateMDFComplianceReport: jest.fn().mockResolvedValue({
    report_url: '/api/reports/test-report.html',
    report_html: '<html>Test report</html>',
    summary: {
      total_allocated: 10000,
      total_used: 5000,
      remaining: 5000,
      utilization_rate: 50,
      meetings_count: 5
    }
  })
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        client_secret: 'pi_test_client_secret',
        status: 'requires_payment_method'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        status: 'succeeded'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_refund',
        amount: 150000,
        status: 'succeeded'
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/test',
          payment_intent: 'pi_test_payment_intent'
        })
      }
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent'
          }
        }
      })
    }
  }));
});

// Global test timeout
jest.setTimeout(10000);