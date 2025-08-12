const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const StructuredQualificationService = require('../services/structuredQualification');

/**
 * Structured 4-Step Qualification API Routes
 * Handles the intelligent 4-question flow with follow-ups
 */

// POST /api/qualification/start - Start new qualification session
router.post('/start', [
  body('prospectId').isInt().withMessage('Valid prospect ID required'),
  body('companyName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { prospectId, companyName } = req.body;
    
    console.log(`🎯 Starting structured qualification for prospect ${prospectId}`);
    
    const qualificationService = new StructuredQualificationService();
    const result = await qualificationService.startQualification(prospectId, companyName);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Qualification start error:', error);
    res.status(500).json({ 
      error: 'Failed to start qualification', 
      details: error.message 
    });
  }
});

// POST /api/qualification/respond - Submit response and get next question
router.post('/respond', [
  body('conversationId').isInt().withMessage('Valid conversation ID required'),
  body('response').trim().isLength({ min: 1 }).withMessage('Response cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { conversationId, response } = req.body;
    
    console.log(`🎯 Processing response for conversation ${conversationId}: "${response}"`);
    
    const qualificationService = new StructuredQualificationService();
    const result = await qualificationService.processResponse(conversationId, response);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Qualification response error:', error);
    res.status(500).json({ 
      error: 'Failed to process response', 
      details: error.message 
    });
  }
});

// GET /api/qualification/:conversationId/status - Get current qualification status
router.get('/:conversationId/status', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const qualificationService = new StructuredQualificationService();
    const state = await qualificationService.getQualificationState(conversationId);
    
    if (!state) {
      return res.status(404).json({ 
        error: 'Qualification session not found' 
      });
    }
    
    res.json({
      success: true,
      conversationId: parseInt(conversationId),
      currentStep: state.current_step,
      totalSteps: 4,
      status: state.status,
      extractedData: state.extracted_data,
      progress: Math.round((state.current_step / 4) * 100),
      startedAt: state.started_at,
      completedAt: state.completed_at
    });
    
  } catch (error) {
    console.error('Qualification status error:', error);
    res.status(500).json({ 
      error: 'Failed to get qualification status', 
      details: error.message 
    });
  }
});

// GET /api/qualification/:conversationId/results - Get final structured results
router.get('/:conversationId/results', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const qualificationService = new StructuredQualificationService();
    const state = await qualificationService.getQualificationState(conversationId);
    
    if (!state) {
      return res.status(404).json({ 
        error: 'Qualification session not found' 
      });
    }
    
    if (state.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Qualification not yet completed',
        currentStep: state.current_step,
        status: state.status
      });
    }
    
    res.json({
      success: true,
      conversationId: parseInt(conversationId),
      status: state.status,
      completedAt: state.completed_at,
      extractedData: state.extracted_data,
      dataQuality: analyzeDataQuality(state.extracted_data)
    });
    
  } catch (error) {
    console.error('Qualification results error:', error);
    res.status(500).json({ 
      error: 'Failed to get qualification results', 
      details: error.message 
    });
  }
});

// Helper function to analyze data quality
function analyzeDataQuality(extractedData) {
  const criticalFields = [
    'problemType', 'jobFunction', 'industry',
    'solutionType', 'businessUrgency', 'budgetStatus'
  ];
  
  const filled = criticalFields.filter(field => extractedData[field]).length;
  const total = criticalFields.length;
  const completeness = Math.round((filled / total) * 100);
  
  let quality = 'Low';
  if (completeness >= 80) quality = 'High';
  else if (completeness >= 60) quality = 'Medium';
  
  return {
    completeness: `${completeness}%`,
    quality,
    filledFields: filled,
    totalFields: total,
    missingCritical: criticalFields.filter(field => !extractedData[field])
  };
}

module.exports = router;