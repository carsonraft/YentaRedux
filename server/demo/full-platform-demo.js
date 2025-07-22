#!/usr/bin/env node

/**
 * Yenta Platform Complete Demo
 * 
 * This comprehensive demo shows the entire AI matchmaking workflow:
 * 1. Vendor registration and profile setup
 * 2. Prospect intake with AI conversation
 * 3. AI readiness scoring and matching
 * 4. Admin dashboard for match management
 * 5. Calendar integration and meeting booking
 * 6. MDF budget tracking and payments
 * 7. Reporting and analytics
 */

const express = require('express');
const cors = require('cors');
const moment = require('moment-timezone');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Comprehensive mock data representing full platform state
const platformData = {
  vendors: [
    {
      id: 1,
      company_name: 'AI Solutions Corp',
      email: 'john@aisolutions.com',
      contact_name: 'John Smith',
      phone: '+1-555-0101',
      website: 'https://aisolutions.com',
      industry: 'AI/ML Consulting',
      size: '50-200',
      description: 'Leading AI implementation consultancy specializing in enterprise solutions',
      expertise: ['Machine Learning', 'Computer Vision', 'NLP', 'Data Analytics'],
      geographic_focus: ['North America', 'Europe'],
      client_types: ['Enterprise', 'Fortune 500'],
      case_studies: ['Reduced customer service costs by 40% for Fortune 100 retailer'],
      mdf_budget: 50000,
      mdf_used: 12500,
      timezone: 'America/New_York',
      calendar_connected: true,
      created_at: '2024-01-10T10:00:00Z'
    },
    {
      id: 2,
      company_name: 'DataTech Analytics',
      email: 'sarah@datatech.com',
      contact_name: 'Sarah Wilson',
      phone: '+1-555-0102',
      website: 'https://datatech.com',
      industry: 'Data Science',
      size: '20-50',
      description: 'Specialized data analytics and business intelligence solutions',
      expertise: ['Business Intelligence', 'Predictive Analytics', 'Data Warehousing'],
      geographic_focus: ['North America'],
      client_types: ['SMB', 'Mid-market'],
      case_studies: ['Increased sales forecasting accuracy by 60% for manufacturing client'],
      mdf_budget: 25000,
      mdf_used: 8000,
      timezone: 'America/Los_Angeles',
      calendar_connected: false,
      created_at: '2024-01-15T14:30:00Z'
    }
  ],
  
  prospects: [
    {
      id: 1,
      company_name: 'Healthcare Tech Inc',
      contact_name: 'Dr. Sarah Johnson',
      email: 'sarah@healthtech.com',
      phone: '+1-555-0201',
      website: 'https://healthtech.com',
      industry: 'Healthcare',
      size: '200-500',
      description: 'Digital health platform serving over 1M patients',
      ai_readiness_score: 85,
      readiness_category: 'HOT',
      use_cases: ['Patient Data Analysis', 'Predictive Health Analytics', 'Automated Diagnosis'],
      budget_range: '$100K-500K',
      timeline: '3-6 months',
      decision_makers: ['CTO', 'Chief Medical Officer'],
      current_solutions: ['Basic analytics dashboard', 'Manual reporting'],
      pain_points: ['Data silos', 'Manual processes', 'Lack of predictive insights'],
      conversation_summary: 'Company is ready to implement AI for patient data analysis. Strong technical team, clear budget, and executive buy-in.',
      created_at: '2024-01-20T09:15:00Z',
      status: 'qualified'
    },
    {
      id: 2,
      company_name: 'FinTech Startup',
      contact_name: 'Mike Chen',
      email: 'mike@fintech.com',
      phone: '+1-555-0202',
      website: 'https://fintech.com',
      industry: 'Financial Services',
      size: '50-100',
      description: 'Mobile payment processing for small businesses',
      ai_readiness_score: 65,
      readiness_category: 'WARM',
      use_cases: ['Fraud Detection', 'Risk Assessment', 'Customer Analytics'],
      budget_range: '$50K-100K',
      timeline: '6-12 months',
      decision_makers: ['CEO', 'CTO'],
      current_solutions: ['Basic fraud rules', 'Manual risk review'],
      pain_points: ['High false positives', 'Manual review process', 'Limited customer insights'],
      conversation_summary: 'Growing startup interested in AI for fraud detection. Limited budget but clear need.',
      created_at: '2024-01-22T16:45:00Z',
      status: 'qualified'
    },
    {
      id: 3,
      company_name: 'Manufacturing Corp',
      contact_name: 'Robert Davis',
      email: 'robert@manufacturing.com',
      phone: '+1-555-0203',
      website: 'https://manufacturing.com',
      industry: 'Manufacturing',
      size: '1000+',
      description: 'Industrial equipment manufacturer',
      ai_readiness_score: 45,
      readiness_category: 'COOL',
      use_cases: ['Predictive Maintenance', 'Quality Control', 'Supply Chain Optimization'],
      budget_range: '$25K-50K',
      timeline: '12+ months',
      decision_makers: ['Operations Director'],
      current_solutions: ['Legacy ERP system', 'Manual quality checks'],
      pain_points: ['Equipment downtime', 'Quality issues', 'Inefficient processes'],
      conversation_summary: 'Traditional manufacturer exploring AI. Limited technical expertise and budget constraints.',
      created_at: '2024-01-25T11:20:00Z',
      status: 'lead'
    }
  ],
  
  matches: [
    {
      id: 1,
      vendor_id: 1,
      prospect_id: 1,
      match_score: 92,
      match_reasoning: 'Perfect alignment: AI Solutions Corp has extensive healthcare AI experience, prospect has clear AI use cases and strong technical readiness (score: 85)',
      status: 'approved',
      created_at: '2024-01-21T10:00:00Z',
      approved_at: '2024-01-21T10:30:00Z',
      approved_by: 1
    },
    {
      id: 2,
      vendor_id: 2,
      prospect_id: 2,
      match_score: 78,
      match_reasoning: 'Good fit: DataTech Analytics specializes in business intelligence, prospect needs fraud detection analytics. Budget alignment.',
      status: 'pending',
      created_at: '2024-01-23T14:15:00Z'
    },
    {
      id: 3,
      vendor_id: 1,
      prospect_id: 3,
      match_score: 65,
      match_reasoning: 'Moderate fit: AI Solutions Corp could help with predictive maintenance, but prospect has limited AI readiness (score: 45)',
      status: 'rejected',
      created_at: '2024-01-26T09:45:00Z',
      rejected_at: '2024-01-26T10:00:00Z',
      rejection_reason: 'Prospect not technically ready for advanced AI implementation'
    }
  ],
  
  meetings: [
    {
      id: 1,
      vendor_id: 1,
      prospect_id: 1,
      match_id: 1,
      scheduled_at: '2024-01-30T15:00:00Z',
      duration_minutes: 60,
      status: 'scheduled',
      title: 'AI Implementation Discovery Call',
      description: 'Initial consultation to discuss healthcare AI implementation strategy',
      google_event_id: 'cal_event_123',
      calendar_link: 'https://calendar.google.com/calendar/event?eid=123',
      meet_link: 'https://meet.google.com/abc-defg-hij',
      timezone: 'America/New_York',
      created_at: '2024-01-21T11:00:00Z'
    }
  ],
  
  conversations: [
    {
      id: 1,
      prospect_id: 1,
      messages: [
        {
          role: 'assistant',
          content: 'Hi! I\'m Yenta\'s AI assistant. I help match companies with the right AI solutions. Can you tell me about your company and what brings you here today?',
          timestamp: '2024-01-20T09:15:00Z'
        },
        {
          role: 'user',
          content: 'Hi, I\'m Sarah from Healthcare Tech Inc. We\'re a digital health platform with over 1 million patients. We\'re looking to implement AI for better patient data analysis and predictive health insights.',
          timestamp: '2024-01-20T09:16:30Z'
        },
        {
          role: 'assistant',
          content: 'That\'s exciting! Healthcare AI has tremendous potential. Can you tell me more about your current data infrastructure? Do you have a dedicated data science team?',
          timestamp: '2024-01-20T09:17:00Z'
        },
        {
          role: 'user',
          content: 'We have a strong technical team including 3 data scientists and our CTO is very supportive of AI initiatives. Our data is currently in multiple systems but we\'re working on consolidation.',
          timestamp: '2024-01-20T09:18:15Z'
        },
        {
          role: 'assistant',
          content: 'Perfect! It sounds like you have good technical foundations. What\'s your budget range for an AI implementation project?',
          timestamp: '2024-01-20T09:18:45Z'
        },
        {
          role: 'user',
          content: 'We\'ve allocated $200-400K for this initiative and we\'d like to start within the next 3-6 months.',
          timestamp: '2024-01-20T09:19:30Z'
        }
      ],
      ai_analysis: {
        readiness_score: 85,
        category: 'HOT',
        reasoning: 'Strong technical team, clear budget allocation, executive support, and specific use cases identified. Company is ready for AI implementation.',
        key_factors: [
          'Dedicated data science team (3 members)',
          'CTO support and executive buy-in',
          'Clear budget allocation ($200-400K)',
          'Reasonable timeline (3-6 months)',
          'Specific use cases identified'
        ]
      },
      created_at: '2024-01-20T09:15:00Z',
      completed_at: '2024-01-20T09:25:00Z'
    }
  ],
  
  mdf_expenses: [
    {
      id: 1,
      vendor_id: 1,
      prospect_id: 1,
      amount: 2500,
      category: 'meeting_fee',
      description: 'Initial consultation meeting fee',
      invoice_id: 'INV-2024-001',
      payment_status: 'paid',
      created_at: '2024-01-21T12:00:00Z'
    },
    {
      id: 2,
      vendor_id: 1,
      amount: 5000,
      category: 'project_bonus',
      description: 'Qualified lead bonus for Healthcare Tech Inc',
      invoice_id: 'INV-2024-002',
      payment_status: 'pending',
      created_at: '2024-01-22T10:00:00Z'
    }
  ],
  
  analytics: {
    summary: {
      total_vendors: 2,
      total_prospects: 3,
      total_matches: 3,
      total_meetings: 1,
      conversion_rate: 0.33,
      avg_match_score: 78.3,
      mdf_utilization: 0.41
    },
    by_category: {
      HOT: { count: 1, conversion_rate: 1.0 },
      WARM: { count: 1, conversion_rate: 0.0 },
      COOL: { count: 1, conversion_rate: 0.0 },
      COLD: { count: 0, conversion_rate: 0.0 }
    }
  }
};

// Helper functions
function extractBusinessType(message) {
  if (message.includes('house') || message.includes('real estate') || message.includes('property') || message.includes('build homes') || message.includes('construction') || message.includes('contractor')) return 'construction';
  if (message.includes('healthcare') || message.includes('medical') || message.includes('hospital')) return 'healthcare';
  if (message.includes('fintech') || message.includes('financial') || message.includes('bank')) return 'financial services';
  if (message.includes('retail') || message.includes('ecommerce') || message.includes('store')) return 'retail';
  if (message.includes('manufacturing') || message.includes('factory') || message.includes('industrial')) return 'manufacturing';
  if (message.includes('software') || message.includes('tech') || message.includes('saas')) return 'technology';
  if (message.includes('restaurant') || message.includes('food') || message.includes('catering')) return 'food service';
  return null;
}

function assessTechLevel(message) {
  const lowIndicators = ['spreadsheet', 'excel', 'manual', 'no data', 'basic', 'pivot table', 'nothing', 'pen and paper'];
  const mediumIndicators = ['some', 'basic database', 'wordpress', 'simple', 'crm', 'limited'];
  const highIndicators = ['data science', 'engineering', 'api', 'database', 'cloud', 'technical team', 'developer', 'engineer'];
  
  const hasHigh = highIndicators.some(indicator => message.includes(indicator));
  const hasMedium = mediumIndicators.some(indicator => message.includes(indicator));
  const hasLow = lowIndicators.some(indicator => message.includes(indicator));
  
  if (hasHigh) return 'high';
  if (hasMedium && !hasLow) return 'medium';
  return 'low';
}

function calculateReadinessScore(conversation) {
  // Simulate AI scoring logic
  const conversationLower = conversation.toLowerCase();
  const factors = {
    technicalTeam: 0,
    budget: 0,
    timeline: 0,
    executive: 0,
    useCases: 0
  };
  
  // Technical team scoring
  if (conversationLower.includes('data scien') || conversationLower.includes('technical team')) {
    factors.technicalTeam = 25;
  } else if (conversationLower.includes('developer') || conversationLower.includes('engineer')) {
    factors.technicalTeam = 15;
  } else if (conversationLower.includes('it team')) {
    factors.technicalTeam = 10;
  }
  
  // Budget scoring (including amounts without K suffix)
  if (conversationLower.includes('$')) {
    const budgetMatch = conversationLower.match(/\$?\s*(\d+)([kK])?/);
    if (budgetMatch) {
      let budget = parseInt(budgetMatch[1]);
      if (!budgetMatch[2]) { // No 'k' suffix, assume dollars
        budget = budget / 1000; // Convert to thousands
      }
      factors.budget = budget >= 200 ? 20 : budget >= 100 ? 15 : budget >= 50 ? 10 : budget >= 10 ? 8 : budget >= 3 ? 5 : 2;
    }
  } else if (conversationLower.includes('budget')) {
    factors.budget = 5;
  }
  
  // Timeline scoring
  if (conversationLower.includes('month')) {
    if (conversationLower.includes('1-3 month') || conversationLower.includes('next month')) {
      factors.timeline = 15;
    } else if (conversationLower.includes('3-6 month')) {
      factors.timeline = 12;
    } else if (conversationLower.includes('6-12 month')) {
      factors.timeline = 8;
    } else {
      factors.timeline = 5;
    }
  }
  
  // Executive buy-in
  if (conversationLower.includes('cto') || conversationLower.includes('ceo') || conversationLower.includes('executive')) {
    factors.executive = 20;
  } else if (conversationLower.includes('director') || conversationLower.includes('vp')) {
    factors.executive = 15;
  } else if (conversationLower.includes('manager')) {
    factors.executive = 10;
  }
  
  // Use cases
  if (conversationLower.includes('implement') || conversationLower.includes('use case') || conversationLower.includes('looking to')) {
    factors.useCases = 20;
  } else if (conversationLower.includes('exploring') || conversationLower.includes('interested')) {
    factors.useCases = 10;
  }
  
  return Object.values(factors).reduce((sum, score) => sum + score, 0);
}

function categorizeReadiness(score) {
  if (score >= 80) return 'HOT';
  if (score >= 60) return 'WARM';
  if (score >= 40) return 'COOL';
  return 'COLD';
}

// API Routes

// Dashboard Overview
app.get('/api/dashboard', (req, res) => {
  res.json({
    vendors: platformData.vendors,
    prospects: platformData.prospects,
    matches: platformData.matches,
    meetings: platformData.meetings,
    analytics: platformData.analytics
  });
});

// Vendor Management
app.get('/api/vendors', (req, res) => {
  res.json(platformData.vendors);
});

app.post('/api/vendors/register', (req, res) => {
  const vendor = {
    id: platformData.vendors.length + 1,
    ...req.body,
    mdf_budget: req.body.mdf_budget || 25000,
    mdf_used: 0,
    calendar_connected: false,
    created_at: new Date().toISOString()
  };
  
  platformData.vendors.push(vendor);
  res.json({ message: 'Vendor registered successfully', vendor });
});

// Prospect Management
app.get('/api/prospects', (req, res) => {
  res.json(platformData.prospects);
});

// AI Conversation Simulation
app.post('/api/conversation/start', (req, res) => {
  const conversation = {
    id: platformData.conversations.length + 1,
    prospect_id: null,
    messages: [
      {
        role: 'assistant',
        content: 'Hi! I\'m Yenta\'s AI assistant. I help match companies with the right AI solutions. Can you tell me about your company and what brings you here today?',
        timestamp: new Date().toISOString()
      }
    ],
    created_at: new Date().toISOString()
  };
  
  platformData.conversations.push(conversation);
  res.json(conversation);
});

app.post('/api/conversation/:id/message', (req, res) => {
  const conversationId = parseInt(req.params.id);
  const conversation = platformData.conversations.find(c => c.id === conversationId);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  // Add user message
  conversation.messages.push({
    role: 'user',
    content: req.body.message,
    timestamp: new Date().toISOString()
  });
  
  // Generate AI response (intelligent)
  let aiResponse = '';
  const lastMessage = req.body.message.toLowerCase();
  const messageCount = conversation.messages.filter(m => m.role === 'user').length;
  
  // Conversation flow based on user message count and content
  if (messageCount === 1) {
    // Acknowledge their business and ask about tech
    const businessType = extractBusinessType(lastMessage);
    aiResponse = `${businessType ? `A ${businessType} company - ` : ''}That sounds interesting! To understand how AI might help, can you tell me about your current data infrastructure and technical capabilities? Do you have dedicated IT staff or data science resources?`;
  } else if (messageCount === 2) {
    // Respond intelligently to their tech capabilities
    const techLevel = assessTechLevel(lastMessage);
    if (techLevel === 'high') {
      aiResponse = 'Excellent! It sounds like you have strong technical foundations. What\'s your budget range and timeline for an AI project?';
    } else if (techLevel === 'medium') {
      aiResponse = 'I see you have some technical capabilities. AI could still be valuable, but might require additional infrastructure development. What\'s your budget range and timeline?';
    } else {
      aiResponse = 'I understand - many successful companies start with spreadsheets! AI implementation would likely require building some foundational data infrastructure first. What budget range are you considering for this type of initiative?';
    }
  } else if (messageCount === 3) {
    // Finish conversation and create prospect
    const fullConversation = conversation.messages.map(m => m.content).join(' ');
    const score = calculateReadinessScore(fullConversation);
    const category = categorizeReadiness(score);
    
    const prospect = {
      id: platformData.prospects.length + 1,
      ai_readiness_score: score,
      readiness_category: category,
      conversation_summary: 'AI conversation completed. Prospect shows interest in AI implementation.',
      created_at: new Date().toISOString(),
      status: score >= 60 ? 'qualified' : 'lead',
      ...req.body.prospectData
    };
    
    platformData.prospects.push(prospect);
    conversation.prospect_id = prospect.id;
    conversation.completed_at = new Date().toISOString();
    conversation.ai_analysis = {
      readiness_score: score,
      category: category,
      reasoning: `Analysis based on conversation indicates ${category} readiness with score ${score}/100`
    };
    
    // Generate contextual final response
    let finalMessage = '';
    if (score >= 80) {
      finalMessage = `Excellent! You're well-positioned for AI implementation. I'll connect you with our top solution providers who can help you get started quickly.`;
    } else if (score >= 60) {
      finalMessage = `Good potential for AI implementation. I'll connect you with vendors who specialize in helping companies build the necessary foundations while implementing AI solutions.`;
    } else if (score >= 40) {
      finalMessage = `While you're not quite ready for advanced AI, there are foundational steps that could prepare you. I'll connect you with consultants who can help build your data infrastructure first.`;
    } else {
      finalMessage = `I'd recommend focusing on basic data organization and digital processes before considering AI. However, some of our partners specialize in helping companies at your stage prepare for future AI adoption.`;
    }
    
    aiResponse = `Thank you for the information! Based on our conversation, I've assessed your AI readiness score as ${score}/100 (${category}). ${finalMessage}`;
    
    // Auto-generate matches for qualified prospects  
    if (score >= 40) { // Lower threshold to include more prospects
      generateMatches(prospect);
    }
  } else {
    // For any additional messages beyond the 3-message flow
    aiResponse = 'Thank you for the additional information. Based on our conversation, I have enough details to assess your AI readiness and connect you with suitable vendors.';
  }
  
  conversation.messages.push({
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString()
  });
  
  res.json(conversation);
});

function generateMatches(prospect) {
  platformData.vendors.forEach(vendor => {
    // Simple matching logic
    let matchScore = 50; // Base score
    
    // Industry alignment
    if (vendor.industry.toLowerCase().includes('ai') && prospect.ai_readiness_score > 70) {
      matchScore += 20;
    }
    
    // Readiness score factor
    matchScore += Math.min(prospect.ai_readiness_score * 0.3, 30);
    
    // Random variation
    matchScore += Math.random() * 10 - 5;
    matchScore = Math.round(Math.min(matchScore, 100));
    
    if (matchScore >= 60) {
      const match = {
        id: platformData.matches.length + 1,
        vendor_id: vendor.id,
        prospect_id: prospect.id,
        match_score: matchScore,
        match_reasoning: `Generated match based on prospect readiness (${prospect.ai_readiness_score}) and vendor expertise`,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      platformData.matches.push(match);
    }
  });
}

// Match Management
app.get('/api/matches', (req, res) => {
  const enrichedMatches = platformData.matches.map(match => ({
    ...match,
    vendor: platformData.vendors.find(v => v.id === match.vendor_id),
    prospect: platformData.prospects.find(p => p.id === match.prospect_id)
  }));
  
  res.json(enrichedMatches);
});

app.post('/api/matches/:id/approve', (req, res) => {
  const matchId = parseInt(req.params.id);
  const match = platformData.matches.find(m => m.id === matchId);
  
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }
  
  match.status = 'approved';
  match.approved_at = new Date().toISOString();
  match.approved_by = 1; // Admin user ID
  
  res.json({ message: 'Match approved successfully', match });
});

// Meeting Management
app.get('/api/meetings', (req, res) => {
  const enrichedMeetings = platformData.meetings.map(meeting => ({
    ...meeting,
    vendor: platformData.vendors.find(v => v.id === meeting.vendor_id),
    prospect: platformData.prospects.find(p => p.id === meeting.prospect_id)
  }));
  
  res.json(enrichedMeetings);
});

// MDF Tracking
app.get('/api/mdf/summary', (req, res) => {
  const summary = platformData.vendors.map(vendor => ({
    vendor_id: vendor.id,
    vendor_name: vendor.company_name,
    budget: vendor.mdf_budget,
    used: vendor.mdf_used,
    remaining: vendor.mdf_budget - vendor.mdf_used,
    utilization: vendor.mdf_used / vendor.mdf_budget,
    expenses: platformData.mdf_expenses.filter(e => e.vendor_id === vendor.id)
  }));
  
  res.json(summary);
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json(platformData.analytics);
});

// Demo Frontend
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Yenta Platform - Complete Demo</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
            .header { background: #2563eb; color: white; padding: 1rem 2rem; }
            .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
            .dashboard { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
            .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .metric { text-align: center; }
            .metric-value { font-size: 2.5rem; font-weight: bold; color: #2563eb; margin-bottom: 0.5rem; }
            .metric-label { font-size: 0.9rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .section { margin: 2rem 0; }
            .section-title { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937; }
            .tabs { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 1rem; }
            .tab { padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; }
            .tab.active { border-bottom-color: #2563eb; color: #2563eb; }
            .tab:hover { background: #f3f4f6; }
            .content { display: none; }
            .content.active { display: block; }
            .prospect-card, .vendor-card, .match-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
            .score { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; color: white; font-size: 0.8rem; font-weight: bold; }
            .score.HOT { background: #dc2626; }
            .score.WARM { background: #f59e0b; }
            .score.COOL { background: #3b82f6; }
            .score.COLD { background: #6b7280; }
            .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
            .status.approved { background: #d1fae5; color: #065f46; }
            .status.pending { background: #fef3c7; color: #92400e; }
            .status.rejected { background: #fee2e2; color: #991b1b; }
            .status.scheduled { background: #dbeafe; color: #1e40af; }
            button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
            button:hover { background: #1d4ed8; }
            .chat-container { background: white; border-radius: 12px; padding: 1rem; height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; }
            .message { margin: 0.5rem 0; padding: 0.75rem; border-radius: 8px; max-width: 80%; }
            .message.assistant { background: #f3f4f6; margin-right: auto; }
            .message.user { background: #2563eb; color: white; margin-left: auto; }
            .chat-input { display: flex; gap: 0.5rem; margin-top: 1rem; }
            .chat-input input { flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; }
            .progress-fill { background: #2563eb; height: 100%; transition: width 0.3s ease; }
            .mdf-usage { display: flex; align-items: center; gap: 1rem; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 Yenta AI Matchmaking Platform - Complete Demo</h1>
            <p>End-to-end B2B AI solution matching with MDF budget tracking</p>
        </div>
        
        <div class="container">
            <div class="dashboard">
                <div class="card metric">
                    <div class="metric-value" id="vendors-count">-</div>
                    <div class="metric-label">Active Vendors</div>
                </div>
                <div class="card metric">
                    <div class="metric-value" id="prospects-count">-</div>
                    <div class="metric-label">Qualified Prospects</div>
                </div>
                <div class="card metric">
                    <div class="metric-value" id="matches-count">-</div>
                    <div class="metric-label">Successful Matches</div>
                </div>
            </div>
            
            <div class="section">
                <div class="tabs">
                    <div class="tab active" onclick="showTab('prospect-intake')">1. Prospect Intake</div>
                    <div class="tab" onclick="showTab('ai-matching')">2. AI Matching</div>
                    <div class="tab" onclick="showTab('admin-dashboard')">3. Admin Dashboard</div>
                    <div class="tab" onclick="showTab('meetings')">4. Meetings</div>
                    <div class="tab" onclick="showTab('mdf-tracking')">5. MDF Tracking</div>
                </div>
                
                <div id="prospect-intake" class="content active">
                    <div class="section-title">AI-Powered Prospect Intake</div>
                    <div class="card">
                        <h3>Conversational AI Assessment</h3>
                        <p style="margin-bottom: 1rem; color: #6b7280;">Our AI assistant evaluates prospect readiness through natural conversation</p>
                        
                        <div class="chat-container" id="chat-container">
                            <div class="message assistant">
                                Hi! I'm Yenta's AI assistant. I help match companies with the right AI solutions. Can you tell me about your company and what brings you here today?
                            </div>
                        </div>
                        
                        <div class="chat-input">
                            <input type="text" id="chat-input" placeholder="Type your response..." />
                            <button onclick="sendMessage()">Send</button>
                            <button onclick="startDemo()">Demo Conversation</button>
                        </div>
                    </div>
                </div>
                
                <div id="ai-matching" class="content">
                    <div class="section-title">AI Matching Results</div>
                    <div id="prospects-list"></div>
                </div>
                
                <div id="admin-dashboard" class="content">
                    <div class="section-title">Admin Match Management</div>
                    <div id="matches-list"></div>
                </div>
                
                <div id="meetings" class="content">
                    <div class="section-title">Meeting Management</div>
                    <div id="meetings-list"></div>
                </div>
                
                <div id="mdf-tracking" class="content">
                    <div class="section-title">MDF Budget Tracking</div>
                    <div id="mdf-summary"></div>
                </div>
            </div>
        </div>

        <script>
            const API_BASE = 'http://localhost:${PORT}/api';
            let currentConversation = null;
            
            // Tab management
            function showTab(tabName) {
                document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
                
                event.target.classList.add('active');
                document.getElementById(tabName).classList.add('active');
                
                // Load content for specific tabs
                if (tabName === 'ai-matching') loadProspects();
                if (tabName === 'admin-dashboard') loadMatches();
                if (tabName === 'meetings') loadMeetings();
                if (tabName === 'mdf-tracking') loadMDFSummary();
            }
            
            // Load dashboard metrics
            async function loadDashboard() {
                try {
                    const response = await fetch(API_BASE + '/dashboard');
                    const data = await response.json();
                    
                    document.getElementById('vendors-count').textContent = data.vendors.length;
                    document.getElementById('prospects-count').textContent = data.prospects.filter(p => p.status === 'qualified').length;
                    document.getElementById('matches-count').textContent = data.matches.filter(m => m.status === 'approved').length;
                } catch (error) {
                    console.error('Error loading dashboard:', error);
                }
            }
            
            // Chat functionality
            async function sendMessage() {
                const input = document.getElementById('chat-input');
                const message = input.value.trim();
                if (!message) return;
                
                // Add user message to chat
                addMessage('user', message);
                input.value = '';
                
                try {
                    if (!currentConversation) {
                        // Start new conversation
                        const response = await fetch(API_BASE + '/conversation/start', { method: 'POST' });
                        currentConversation = await response.json();
                    }
                    
                    // Send message
                    const response = await fetch(API_BASE + '/conversation/' + currentConversation.id + '/message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            message,
                            prospectData: {
                                company_name: 'Demo Company',
                                contact_name: 'Demo User',
                                email: 'demo@company.com'
                            }
                        })
                    });
                    
                    const conversation = await response.json();
                    const lastMessage = conversation.messages[conversation.messages.length - 1];
                    
                    // Add AI response
                    setTimeout(() => {
                        addMessage('assistant', lastMessage.content);
                        
                        // If conversation is complete, show results
                        if (conversation.completed_at) {
                            setTimeout(() => {
                                showConversationResults(conversation);
                            }, 1000);
                        }
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error sending message:', error);
                    addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
                }
            }
            
            function addMessage(role, content) {
                const container = document.getElementById('chat-container');
                const message = document.createElement('div');
                message.className = 'message ' + role;
                message.textContent = content;
                container.appendChild(message);
                container.scrollTop = container.scrollHeight;
            }
            
            function showConversationResults(conversation) {
                const analysis = conversation.ai_analysis;
                addMessage('assistant', \`🎯 Assessment Complete!\\n\\nAI Readiness Score: \${analysis.readiness_score}/100\\nCategory: \${analysis.category}\\n\\n\${analysis.reasoning}\`);
            }
            
            // Demo conversation
            async function startDemo() {
                const demoMessages = [
                    'Hi, I\\'m Sarah from Healthcare Tech Inc. We\\'re a digital health platform with over 1 million patients.',
                    'We have a strong technical team including 3 data scientists and our CTO is very supportive of AI initiatives.',
                    'We\\'ve allocated $300K for this initiative and we\\'d like to start within the next 4 months.'
                ];
                
                for (let i = 0; i < demoMessages.length; i++) {
                    setTimeout(() => {
                        document.getElementById('chat-input').value = demoMessages[i];
                        sendMessage();
                    }, i * 3000);
                }
            }
            
            // Load prospects
            async function loadProspects() {
                try {
                    const response = await fetch(API_BASE + '/prospects');
                    const prospects = await response.json();
                    
                    const container = document.getElementById('prospects-list');
                    container.innerHTML = prospects.map(prospect => \`
                        <div class="prospect-card">
                            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                                <h3>\${prospect.company_name}</h3>
                                <span class="score \${prospect.readiness_category}">\${prospect.ai_readiness_score}/100 - \${prospect.readiness_category}</span>
                            </div>
                            <p><strong>Contact:</strong> \${prospect.contact_name} (\${prospect.email})</p>
                            <p><strong>Use Cases:</strong> \${prospect.use_cases ? prospect.use_cases.join(', ') : 'N/A'}</p>
                            <p><strong>Budget:</strong> \${prospect.budget_range || 'Not specified'}</p>
                            <p><strong>Timeline:</strong> \${prospect.timeline || 'Not specified'}</p>
                            <p><strong>Summary:</strong> \${prospect.conversation_summary || 'No summary available'}</p>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading prospects:', error);
                }
            }
            
            // Load matches
            async function loadMatches() {
                try {
                    const response = await fetch(API_BASE + '/matches');
                    const matches = await response.json();
                    
                    const container = document.getElementById('matches-list');
                    container.innerHTML = matches.map(match => \`
                        <div class="match-card">
                            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                                <h3>Match Score: \${match.match_score}%</h3>
                                <span class="status \${match.status}">\${match.status.toUpperCase()}</span>
                            </div>
                            <p><strong>Vendor:</strong> \${match.vendor.company_name}</p>
                            <p><strong>Prospect:</strong> \${match.prospect.company_name}</p>
                            <p><strong>Reasoning:</strong> \${match.match_reasoning}</p>
                            \${match.status === 'pending' ? '<button onclick="approveMatch(' + match.id + ')">Approve Match</button>' : ''}
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading matches:', error);
                }
            }
            
            // Approve match
            async function approveMatch(matchId) {
                try {
                    await fetch(API_BASE + '/matches/' + matchId + '/approve', { method: 'POST' });
                    loadMatches(); // Reload matches
                    alert('Match approved! Meeting can now be scheduled.');
                } catch (error) {
                    console.error('Error approving match:', error);
                }
            }
            
            // Load meetings
            async function loadMeetings() {
                try {
                    const response = await fetch(API_BASE + '/meetings');
                    const meetings = await response.json();
                    
                    const container = document.getElementById('meetings-list');
                    container.innerHTML = meetings.length ? meetings.map(meeting => \`
                        <div class="card">
                            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                                <h3>\${meeting.title}</h3>
                                <span class="status \${meeting.status}">\${meeting.status.toUpperCase()}</span>
                            </div>
                            <p><strong>Date:</strong> \${new Date(meeting.scheduled_at).toLocaleString()}</p>
                            <p><strong>Duration:</strong> \${meeting.duration_minutes} minutes</p>
                            <p><strong>Vendor:</strong> \${meeting.vendor.company_name}</p>
                            <p><strong>Prospect:</strong> \${meeting.prospect.company_name}</p>
                            <p><strong>Description:</strong> \${meeting.description}</p>
                            \${meeting.meet_link ? '<p><a href="' + meeting.meet_link + '" target="_blank">Join Meeting</a></p>' : ''}
                        </div>
                    \`).join('') : '<p>No meetings scheduled yet.</p>';
                } catch (error) {
                    console.error('Error loading meetings:', error);
                }
            }
            
            // Load MDF summary
            async function loadMDFSummary() {
                try {
                    const response = await fetch(API_BASE + '/mdf/summary');
                    const summary = await response.json();
                    
                    const container = document.getElementById('mdf-summary');
                    container.innerHTML = summary.map(vendor => \`
                        <div class="card">
                            <h3>\${vendor.vendor_name}</h3>
                            <div class="mdf-usage">
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: between;">
                                        <span>Budget Utilization</span>
                                        <span>\${Math.round(vendor.utilization * 100)}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: \${vendor.utilization * 100}%"></div>
                                    </div>
                                    <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #6b7280;">
                                        $\${vendor.used.toLocaleString()} of $\${vendor.budget.toLocaleString()} used
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 1rem;">
                                <h4>Recent Expenses:</h4>
                                \${vendor.expenses.map(expense => \`
                                    <div style="padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px; margin: 0.25rem 0;">
                                        <strong>$\${expense.amount}</strong> - \${expense.description}
                                        <span style="float: right; color: #6b7280;">\${expense.payment_status}</span>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading MDF summary:', error);
                }
            }
            
            // Chat input handling
            document.getElementById('chat-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Initialize
            loadDashboard();
        </script>
    </body>
    </html>
  `);
});

console.log(`🚀 Yenta Platform Complete Demo starting on port ${PORT}`);
console.log(`🎯 Comprehensive B2B AI Matchmaking Platform`);
console.log(`🌍 Open http://localhost:${PORT} to experience the full workflow`);

app.listen(PORT, () => {
  console.log(`\n✅ Complete platform demo running!`);
  console.log(`📊 Features demonstrated:`);
  console.log(`   • AI-powered prospect intake with conversational assessment`);
  console.log(`   • Intelligent vendor-prospect matching with scoring`);
  console.log(`   • Admin dashboard for match approval workflow`);
  console.log(`   • Calendar integration and meeting scheduling`);
  console.log(`   • MDF budget tracking and expense management`);
  console.log(`   • Real-time analytics and reporting`);
  console.log(`\n🎭 Experience the complete Yenta workflow at: http://localhost:${PORT}\n`);
});