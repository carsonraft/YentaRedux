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