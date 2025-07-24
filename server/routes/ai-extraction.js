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
  console.log('🤖 MOCK AI EXTRACTION:', { userMessage, currentRound });
  
  if (!userMessage) {
    return {};
  }
  const lowerMessage = userMessage.toLowerCase();
  const extraction = {
    structured: {},
    context: {},
    artifacts: {}
  };
  
  // Problem type detection (CRITICAL: This was missing and causing conversation loops)
  if (lowerMessage.includes('customer service') || lowerMessage.includes('support') || lowerMessage.includes('helpdesk')) {
    extraction.structured.problemType = 'customer_support';
    extraction.context.challengeDescription = `Customer service and support optimization challenge`;
  } else if (lowerMessage.includes('data') || lowerMessage.includes('analytics') || lowerMessage.includes('reporting')) {
    extraction.structured.problemType = 'data_analysis';
    extraction.context.challengeDescription = `Data analysis and reporting improvement need`;
  } else if (lowerMessage.includes('automat') || lowerMessage.includes('process') || lowerMessage.includes('workflow')) {
    extraction.structured.problemType = 'automation';
    extraction.context.challengeDescription = `Process automation and workflow optimization`;
  } else if (lowerMessage.includes('financial') || lowerMessage.includes('money') || lowerMessage.includes('accounting') || lowerMessage.includes('billing')) {
    extraction.structured.problemType = 'financial_management';
    extraction.context.challengeDescription = `Financial management and tracking systems`;
  } else if (lowerMessage.includes('track') || lowerMessage.includes('time') || lowerMessage.includes('hours') || lowerMessage.includes('timesheet')) {
    extraction.structured.problemType = 'time_tracking';
    extraction.context.challengeDescription = `Time tracking and workforce management`;
  } else if (lowerMessage.includes('hiring') || lowerMessage.includes('recruitment') || lowerMessage.includes('ats') || lowerMessage.includes('applicant tracking')) {
    extraction.structured.problemType = 'other';
    extraction.context.challengeDescription = `Recruitment and applicant tracking modernization`;
  } else if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence') || lowerMessage.includes('machine learning') || lowerMessage.includes('semantic')) {
    extraction.structured.problemType = 'other';
    extraction.context.challengeDescription = `AI and machine learning implementation project`;
  } else if (lowerMessage.includes('crm') || lowerMessage.includes('sales') || lowerMessage.includes('lead')) {
    extraction.structured.problemType = 'other';
    extraction.context.challengeDescription = `CRM and sales process improvement`;
  } else if (userMessage.length > 10) {
    // Default fallback - if user provides substantial input, classify as 'other'
    extraction.structured.problemType = 'other';
    extraction.context.challengeDescription = `Business challenge: ${userMessage.substring(0, 100)}...`;
  }
  
  console.log('🎯 EXTRACTED PROBLEM TYPE:', extraction.structured.problemType);
  
  // Industry detection (with correction handling)
  if (lowerMessage.includes('actually') || lowerMessage.includes('correction') || lowerMessage.includes('change') || lowerMessage.includes('instead')) {
    // User is making a correction - prioritize this extraction
    if (lowerMessage.includes('healthcare') || lowerMessage.includes('medical') || lowerMessage.includes('hospital')) {
      extraction.structured.industry = 'healthcare';
    } else if (lowerMessage.includes('finance') || lowerMessage.includes('bank') || lowerMessage.includes('financial')) {
      extraction.structured.industry = 'finance';
    } else if (lowerMessage.includes('construction') || lowerMessage.includes('building') || lowerMessage.includes('contractor')) {
      extraction.structured.industry = 'construction';
    } else if (lowerMessage.includes('retail') || lowerMessage.includes('store') || lowerMessage.includes('shop')) {
      extraction.structured.industry = 'retail';
    } else if (lowerMessage.includes('manufacturing') || lowerMessage.includes('factory') || lowerMessage.includes('production')) {
      extraction.structured.industry = 'manufacturing';
    } else if (lowerMessage.includes('tech') || lowerMessage.includes('software') || lowerMessage.includes('saas')) {
      extraction.structured.industry = 'technology';
    }
  } else {
    // Normal industry detection
    if (lowerMessage.includes('healthcare') || lowerMessage.includes('medical') || lowerMessage.includes('hospital')) {
      extraction.structured.industry = 'healthcare';
    } else if (lowerMessage.includes('finance') || lowerMessage.includes('bank') || lowerMessage.includes('financial')) {
      extraction.structured.industry = 'finance';
    } else if (lowerMessage.includes('construction') || lowerMessage.includes('building') || lowerMessage.includes('contractor')) {
      extraction.structured.industry = 'construction';
    } else if (lowerMessage.includes('retail') || lowerMessage.includes('store') || lowerMessage.includes('shop')) {
      extraction.structured.industry = 'retail';
    } else if (lowerMessage.includes('manufacturing') || lowerMessage.includes('factory') || lowerMessage.includes('production')) {
      extraction.structured.industry = 'manufacturing';
    } else if (lowerMessage.includes('tech') || lowerMessage.includes('software') || lowerMessage.includes('saas')) {
      extraction.structured.industry = 'technology';
    }
  }
  
  // Job function detection
  if (lowerMessage.includes('ceo') || lowerMessage.includes('chief') || lowerMessage.includes('founder') || lowerMessage.includes('president')) {
    extraction.structured.jobFunction = 'c_level';
    extraction.structured.decisionRole = 'chief_decision_maker';
  } else if (lowerMessage.includes('vp') || lowerMessage.includes('vice president')) {
    extraction.structured.jobFunction = 'vp';
    extraction.structured.decisionRole = 'chief_decision_maker';
  } else if (lowerMessage.includes('director')) {
    extraction.structured.jobFunction = 'director';
    extraction.structured.decisionRole = 'team_member';
  } else if (lowerMessage.includes('manager')) {
    extraction.structured.jobFunction = 'manager';
    extraction.structured.decisionRole = 'team_member';
  } else if (lowerMessage.includes('analyst') || lowerMessage.includes('specialist') || lowerMessage.includes('coordinator')) {
    extraction.structured.jobFunction = 'individual_contributor';
    extraction.structured.decisionRole = 'researcher';
  }
  
  // Timeline detection with better patterns
  if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('3 months') || lowerMessage.includes('under 3') || lowerMessage.includes('quickly')) {
    extraction.structured.businessUrgency = 'under_3_months';
    extraction.context.urgencyReasoning = 'High urgency timeline mentioned';
  } else if (lowerMessage.includes('6 months') || lowerMessage.includes('3-6') || lowerMessage.includes('this year')) {
    extraction.structured.businessUrgency = '3_to_6_months';
    extraction.context.urgencyReasoning = 'Medium-term timeline specified';
  } else if (lowerMessage.includes('year') || lowerMessage.includes('long term') || lowerMessage.includes('eventually')) {
    extraction.structured.businessUrgency = '1_year_plus';
    extraction.context.urgencyReasoning = 'Long-term planning timeline';
  }
  
  // Budget status and context
  if (lowerMessage.includes('exploring') || lowerMessage.includes('research') || lowerMessage.includes('looking into')) {
    extraction.structured.budgetStatus = 'just_exploring';
    extraction.context.budgetContext = 'In early research phase';
  } else if (lowerMessage.includes('planning') || lowerMessage.includes('evaluating')) {
    extraction.structured.budgetStatus = 'in_planning';
    extraction.context.budgetContext = 'In planning and budgeting phase';
  } else if (lowerMessage.includes('approval') || lowerMessage.includes('waiting') || lowerMessage.includes('pending')) {
    extraction.structured.budgetStatus = 'awaiting_approval';
    extraction.context.budgetContext = 'Awaiting budget approval';
  } else if (lowerMessage.includes('approved') || lowerMessage.includes('budget ready') || lowerMessage.includes('funded')) {
    extraction.structured.budgetStatus = 'approved';
    extraction.context.budgetContext = 'Budget approved and ready to proceed';
  }
  
  // Extract budget amounts
  const budgetMatches = userMessage.match(/\$([0-9,]+[kK]?|[0-9]+(?:,000)*)/g);
  if (budgetMatches) {
    extraction.context.budgetContext = `Budget mentioned: ${budgetMatches.join(', ')}`;
  }
  
  // Solution type
  if (lowerMessage.includes('end-to-end') || lowerMessage.includes('complete solution') || lowerMessage.includes('full solution')) {
    extraction.structured.solutionType = 'end_to_end';
    extraction.context.solutionPreferences = 'Prefers comprehensive end-to-end solution';
  } else if (lowerMessage.includes('add to') || lowerMessage.includes('integrate') || lowerMessage.includes('stack') || lowerMessage.includes('existing')) {
    extraction.structured.solutionType = 'add_to_stack';
    extraction.context.solutionPreferences = 'Looking to integrate with existing tech stack';
  }
  
  // Team size extraction
  const teamSizeMatch = userMessage.match(/(\d+)\s*(people|employees|users|team|staff)/i);
  if (teamSizeMatch) {
    extraction.structured.teamSize = teamSizeMatch[1];
  }
  
  // Website extraction
  const websiteMatch = userMessage.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i);
  if (websiteMatch) {
    let website = websiteMatch[0];
    if (!website.startsWith('http')) {
      website = 'https://' + website;
    }
    extraction.artifacts.companyWebsite = website;
  }
  
  // Compliance requirements detection
  if (lowerMessage.includes('hipaa') || lowerMessage.includes('hippa')) {
    extraction.context.complianceDetails = 'HIPAA compliance required';
  } else if (lowerMessage.includes('gdpr')) {
    extraction.context.complianceDetails = 'GDPR compliance required';
  } else if (lowerMessage.includes('pci') || lowerMessage.includes('payment card')) {
    extraction.context.complianceDetails = 'PCI compliance required';
  } else if (lowerMessage.includes('sox') || lowerMessage.includes('sarbanes')) {
    extraction.context.complianceDetails = 'SOX compliance required';
  } else if (lowerMessage.includes('government') || lowerMessage.includes('federal') || lowerMessage.includes('regulation')) {
    extraction.context.complianceDetails = 'Government/federal compliance required';
  } else if (lowerMessage.includes('none') || lowerMessage.includes('no compliance') || lowerMessage.includes('not required') || lowerMessage === 'no') {
    extraction.context.complianceDetails = 'No compliance requirements';
  }
  
  // Key quotes extraction
  if (userMessage.length > 20) {
    extraction.artifacts.keyQuotes = [userMessage];
  }
  
  console.log('✅ FINAL EXTRACTION RESULT:', extraction);
  return extraction;
}

module.exports = router;