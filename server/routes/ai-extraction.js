const express = require('express');
const router = express.Router();

// Mock AI extraction endpoint (replace with actual OpenAI call later)
router.post('/extract-info', async (req, res) => {
  try {
    const { prompt, userMessage, currentRound } = req.body;
    
    // For now, return a mock response
    // In production, this would call OpenAI with the extraction prompt
    const mockExtraction = extractWithMockAI(userMessage, currentRound);
    
    res.json(mockExtraction);
  } catch (error) {
    console.error('AI extraction error:', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

function extractWithMockAI(userMessage, currentRound) {
  if (!userMessage) {
    return {};
  }
  const lowerMessage = userMessage.toLowerCase();
  const extraction = {};
  
  // Problem type detection (CRITICAL: This was missing and causing conversation loops)
  if (lowerMessage.includes('customer service') || lowerMessage.includes('support') || lowerMessage.includes('helpdesk')) {
    extraction.problemType = 'customer_support';
  } else if (lowerMessage.includes('data') || lowerMessage.includes('analytics') || lowerMessage.includes('reporting')) {
    extraction.problemType = 'data_analysis';
  } else if (lowerMessage.includes('automat') || lowerMessage.includes('process') || lowerMessage.includes('workflow')) {
    extraction.problemType = 'automation';
  } else if (lowerMessage.includes('financial') || lowerMessage.includes('money') || lowerMessage.includes('accounting') || lowerMessage.includes('billing')) {
    extraction.problemType = 'financial_management';
  } else if (lowerMessage.includes('track') || lowerMessage.includes('time') || lowerMessage.includes('hours') || lowerMessage.includes('timesheet')) {
    extraction.problemType = 'time_tracking';
  } else if (lowerMessage.includes('hiring') || lowerMessage.includes('recruitment') || lowerMessage.includes('ats') || lowerMessage.includes('applicant tracking')) {
    extraction.problemType = 'other'; // ATS modernization falls under 'other'
  } else if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence') || lowerMessage.includes('machine learning') || lowerMessage.includes('semantic')) {
    extraction.problemType = 'other'; // AI/semantic understanding projects
  } else if (lowerMessage.includes('crm') || lowerMessage.includes('sales') || lowerMessage.includes('lead')) {
    extraction.problemType = 'other';
  } else {
    // Default fallback - if user mentions any business problem, classify as 'other'
    extraction.problemType = 'other';
  }
  
  // Mock intelligent extraction based on patterns
  if (lowerMessage.includes('healthcare') || lowerMessage.includes('medical')) {
    extraction.industry = 'healthcare';
  }
  if (lowerMessage.includes('finance') || lowerMessage.includes('bank')) {
    extraction.industry = 'finance';
  }
  if (lowerMessage.includes('construction') || lowerMessage.includes('building')) {
    extraction.industry = 'construction';
  }
  
  // Job function detection
  if (lowerMessage.includes('ceo') || lowerMessage.includes('chief')) {
    extraction.jobFunction = 'c_level';
  } else if (lowerMessage.includes('vp') || lowerMessage.includes('vice president')) {
    extraction.jobFunction = 'vp';
  } else if (lowerMessage.includes('director')) {
    extraction.jobFunction = 'director';
  } else if (lowerMessage.includes('manager')) {
    extraction.jobFunction = 'manager';
  }
  
  // Timeline detection with better patterns
  if (lowerMessage.includes('urgent') || lowerMessage.includes('3 months') || lowerMessage.includes('under 3')) {
    extraction.businessUrgency = 'under_3_months';
  } else if (lowerMessage.includes('6 months') || lowerMessage.includes('3-6')) {
    extraction.businessUrgency = '3_to_6_months';
  } else if (lowerMessage.includes('year') || lowerMessage.includes('long term')) {
    extraction.businessUrgency = '1_year_plus';
  }
  
  // Budget status
  if (lowerMessage.includes('exploring') || lowerMessage.includes('research')) {
    extraction.budgetStatus = 'just_exploring';
  } else if (lowerMessage.includes('planning')) {
    extraction.budgetStatus = 'in_planning';
  } else if (lowerMessage.includes('approval')) {
    extraction.budgetStatus = 'awaiting_approval';
  } else if (lowerMessage.includes('approved') || lowerMessage.includes('budget ready')) {
    extraction.budgetStatus = 'approved';
  }
  
  // Solution type
  if (lowerMessage.includes('end-to-end') || lowerMessage.includes('complete solution')) {
    extraction.solutionType = 'end_to_end';
  } else if (lowerMessage.includes('add to') || lowerMessage.includes('integrate') || lowerMessage.includes('stack')) {
    extraction.solutionType = 'add_to_stack';
  }
  
  return extraction;
}

module.exports = router;