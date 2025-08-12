const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken: auth } = require('../middleware/auth');

// Import vetting services
const websiteIntelligence = require('../services/websiteIntelligence');
const linkedinValidation = require('../services/linkedinValidation');
const smartBudgetAssessment = require('../services/smartBudgetAssessment');
const multiRoundConversation = require('../services/multiRoundConversation');
const behavioralAnalysis = require('../services/behavioralAnalysis');

/**
 * Enhanced Prospect Vetting API Routes
 * Comprehensive multi-layer vetting system for prospects
 */

// GET /api/vetting/prospect/:id - Get complete vetting summary for a prospect
router.get('/prospect/:id', auth, async (req, res) => {
  try {
    const prospectId = req.params.id;
    
    // Get prospect data
    const prospectResult = await db.query(
      `SELECT p.*, pc.* FROM prospects p 
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id 
       WHERE p.id = $1`,
      [prospectId]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    
    // Get validation summary if exists
    const validationResult = await db.query(
      'SELECT * FROM validation_summary WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1',
      [prospectId]
    );
    
    const vettingData = {
      prospect: {
        id: prospect.id,
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        email: prospect.email,
        industry: prospect.industry,
        domain: prospect.domain,
        created_at: prospect.created_at
      },
      vetting_status: {
        website_analyzed: !!prospect.website_analyzed_at,
        linkedin_validated: prospect.company_verified || prospect.person_verified,
        budget_assessed: !!prospect.budget_analyzed_at,
        conversation_completed: !!prospect.ai_summary,
        overall_status: validationResult.rows.length > 0 ? 'completed' : 'pending'
      },
      scores: {
        readiness_score: prospect.readiness_score || 0,
        legitimacy_score: prospect.legitimacy_score || 0,
        authority_score: prospect.authority_score || 0,
        behavioral_score: prospect.behavioral_score || 50,
        final_score: validationResult.rows[0]?.final_readiness_score || 0
      },
      validation_summary: validationResult.rows[0] || null
    };
    
    res.json(vettingData);
  } catch (error) {
    console.error('Error getting prospect vetting data:', error);
    res.status(500).json({ error: 'Failed to retrieve vetting data' });
  }
});

// POST /api/vetting/website-analysis - Analyze prospect's company website
router.post('/website-analysis', auth, async (req, res) => {
  try {
    const { prospect_id, domain } = req.body;
    
    if (!prospect_id) {
      return res.status(400).json({ error: 'prospect_id is required' });
    }
    
    // Get prospect data
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE id = $1',
      [prospect_id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    const websiteDomain = domain || prospect.domain || 
                         (prospect.email ? prospect.email.split('@')[1] : null);
    
    if (!websiteDomain) {
      return res.status(400).json({ error: 'No domain available for analysis' });
    }
    
    console.log(`🌐 Starting website analysis for prospect ${prospect_id}: ${websiteDomain}`);
    
    // Run website intelligence analysis
    const analysis = await websiteIntelligence.analyzeCompanyWebsite(websiteDomain);
    
    // Update prospect with analysis results
    await db.query(
      `UPDATE prospects 
       SET domain = $1, website_intelligence = $2, legitimacy_score = $3, website_analyzed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [websiteDomain, JSON.stringify(analysis.intelligence), analysis.legitimacy_score, prospect_id]
    );
    
    res.json({
      success: true,
      prospect_id: prospect_id,
      domain: websiteDomain,
      analysis: analysis,
      legitimacy_score: analysis.legitimacy_score
    });
  } catch (error) {
    console.error('Website analysis error:', error);
    res.status(500).json({ error: 'Website analysis failed', details: error.message });
  }
});

// POST /api/vetting/linkedin-validation - Validate prospect via LinkedIn
router.post('/linkedin-validation', auth, async (req, res) => {
  try {
    const { prospect_id } = req.body;
    
    if (!prospect_id) {
      return res.status(400).json({ error: 'prospect_id is required' });
    }
    
    // Get prospect data
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE id = $1',
      [prospect_id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    
    console.log(`🔗 Starting LinkedIn validation for prospect ${prospect_id}`);
    
    // Run LinkedIn validation
    const validation = await linkedinValidation.validateProspectAndCompany({
      company_name: prospect.company_name,
      contact_name: prospect.contact_name,
      email: prospect.email,
      website_domain: prospect.domain
    });
    
    // Update prospect with validation results
    await db.query(
      `UPDATE prospects 
       SET linkedin_company_data = $1, linkedin_person_data = $2, 
           company_verified = $3, person_verified = $4, authority_score = $5
       WHERE id = $6`,
      [
        JSON.stringify(validation.company_validation),
        JSON.stringify(validation.person_validation),
        validation.company_validation.company_found,
        validation.person_validation.person_found,
        validation.person_validation.authority_score || 0,
        prospect_id
      ]
    );
    
    res.json({
      success: true,
      prospect_id: prospect_id,
      validation: validation,
      overall_score: validation.overall_validation_score
    });
  } catch (error) {
    console.error('LinkedIn validation error:', error);
    res.status(500).json({ error: 'LinkedIn validation failed', details: error.message });
  }
});

// POST /api/vetting/budget-assessment - Assess prospect's budget reality
router.post('/budget-assessment', auth, async (req, res) => {
  try {
    const { prospect_id, conversation_id } = req.body;
    
    if (!prospect_id) {
      return res.status(400).json({ error: 'prospect_id is required' });
    }
    
    // Get prospect and conversation data
    const [prospectResult, conversationResult] = await Promise.all([
      db.query('SELECT * FROM prospects WHERE id = $1', [prospect_id]),
      conversation_id ? 
        db.query('SELECT * FROM prospect_conversations WHERE id = $1', [conversation_id]) :
        db.query('SELECT * FROM prospect_conversations WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1', [prospect_id])
    ]);
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    const conversation = conversationResult.rows[0];
    
    if (!conversation) {
      return res.status(400).json({ error: 'No conversation data available for budget assessment' });
    }
    
    console.log(`💰 Starting budget assessment for prospect ${prospect_id}`);
    
    // Prepare company data for assessment
    const companyData = {
      company_name: prospect.company_name,
      industry: prospect.industry,
      estimated_employee_count: prospect.company_size ? parseCompanySize(prospect.company_size) : null,
      verified_employee_count: prospect.linkedin_company_data?.basic_info?.employee_count || null,
      company_type: prospect.linkedin_company_data?.basic_info?.company_type || 'private',
      website_intelligence: prospect.website_intelligence
    };
    
    // Run budget assessment
    const assessment = await smartBudgetAssessment.assessBudgetReality(
      conversation,
      companyData,
      null // Industry benchmarks fetched internally
    );
    
    // Update prospect with assessment results
    await db.query(
      `UPDATE prospects 
       SET budget_assessment = $1, budget_category = $2, 
           investment_seriousness = $3, budget_analyzed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        JSON.stringify(assessment),
        assessment.vendor_visible.budget_category,
        assessment.vendor_visible.investment_seriousness,
        prospect_id
      ]
    );
    
    res.json({
      success: true,
      prospect_id: prospect_id,
      assessment: assessment,
      budget_category: assessment.vendor_visible.budget_category,
      investment_seriousness: assessment.vendor_visible.investment_seriousness
    });
  } catch (error) {
    console.error('Budget assessment error:', error);
    res.status(500).json({ error: 'Budget assessment failed', details: error.message });
  }
});

// POST /api/vetting/comprehensive - Run complete vetting analysis
router.post('/comprehensive', auth, async (req, res) => {
  try {
    const { prospect_id, conversation_id, force_refresh = false } = req.body;
    
    if (!prospect_id) {
      return res.status(400).json({ error: 'prospect_id is required' });
    }
    
    console.log(`🔬 Starting comprehensive vetting for prospect ${prospect_id}`);
    
    // Check if we already have a recent validation summary
    if (!force_refresh) {
      const existingValidation = await db.query(
        'SELECT * FROM validation_summary WHERE prospect_id = $1 AND created_at > NOW() - INTERVAL \'24 hours\'',
        [prospect_id]
      );
      
      if (existingValidation.rows.length > 0) {
        return res.json({
          success: true,
          prospect_id: prospect_id,
          cached: true,
          validation_summary: existingValidation.rows[0]
        });
      }
    }
    
    // Get prospect data
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE id = $1',
      [prospect_id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    const prospect = prospectResult.rows[0];
    
    // Run all vetting components in parallel where possible
    const vettingPromises = [];
    
    // 1. Website analysis (if not done or force refresh)
    if (!prospect.website_analyzed_at || force_refresh) {
      const domain = prospect.domain || (prospect.email ? prospect.email.split('@')[1] : null);
      if (domain) {
        vettingPromises.push(
          websiteIntelligence.analyzeCompanyWebsite(domain)
            .then(analysis => ({ type: 'website', data: analysis }))
            .catch(error => ({ type: 'website', error: error.message }))
        );
      }
    }
    
    let linkedinValidation = null;
    
    // 2. LinkedIn validation (if not done or force refresh)
    if (!prospect.company_verified || !prospect.person_verified || force_refresh) {
      vettingPromises.push(
        linkedinValidation.validateProspectAndCompany({
          company_name: prospect.company_name,
          contact_name: prospect.contact_name,
          email: prospect.email,
          website_domain: prospect.domain
        })
          .then(validation => ({ type: 'linkedin', data: validation }))
          .catch(error => ({ type: 'linkedin', error: error.message }))
      );
    }
    
    // 3. Budget assessment (requires conversation data)
    const conversationResult = await db.query(
      conversation_id ? 
        'SELECT * FROM prospect_conversations WHERE id = $1' :
        'SELECT * FROM prospect_conversations WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1',
      [conversation_id || prospect_id]
    );
    
    if (conversationResult.rows.length > 0) {
      const conversation = conversationResult.rows[0];
      const companyData = {
        company_name: prospect.company_name,
        industry: prospect.industry,
        estimated_employee_count: parseCompanySize(prospect.company_size),
        website_intelligence: prospect.website_intelligence
      };
      
      vettingPromises.push(
        smartBudgetAssessment.assessBudgetReality(conversation, companyData, null)
          .then(assessment => ({ type: 'budget', data: assessment }))
          .catch(error => ({ type: 'budget', error: error.message }))
      );
    }
    
    // Wait for all vetting analyses to complete
    const vettingResults = await Promise.all(vettingPromises);
    
    // Process results and update prospect
    websiteAnalysis = null;
    linkedinValidation = null;
    budgetAssessment = null;
    
    for (const result of vettingResults) {
      if (result.type === 'website' && !result.error) {
        websiteAnalysis = result.data;
        await db.query(
          `UPDATE prospects 
           SET website_intelligence = $1, legitimacy_score = $2, website_analyzed_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [JSON.stringify(websiteAnalysis.intelligence), websiteAnalysis.legitimacy_score, prospect_id]
        );
      } else if (result.type === 'linkedin' && !result.error) {
        linkedinValidation = result.data;
        await db.query(
          `UPDATE prospects 
           SET linkedin_company_data = $1, linkedin_person_data = $2, 
               company_verified = $3, person_verified = $4, authority_score = $5
           WHERE id = $6`,
          [
            JSON.stringify(linkedinValidation.company_validation),
            JSON.stringify(linkedinValidation.person_validation),
            linkedinValidation.company_validation.company_found,
            linkedinValidation.person_validation.person_found,
            linkedinValidation.person_validation.authority_score || 0,
            prospect_id
          ]
        );
      } else if (result.type === 'budget' && !result.error) {
        budgetAssessment = result.data;
        await db.query(
          `UPDATE prospects 
           SET budget_assessment = $1, budget_category = $2, 
               investment_seriousness = $3, budget_analyzed_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [
            JSON.stringify(budgetAssessment),
            budgetAssessment.vendor_visible.budget_category,
            budgetAssessment.vendor_visible.investment_seriousness,
            prospect_id
          ]
        );
      }
    }
    
    // Calculate comprehensive scores
    const finalReadinessScore = await calculateComprehensiveScore(prospect_id);
    const finalCategory = determineReadinessCategory(finalReadinessScore);
    
    // Create validation summary
    const validationSummary = await createValidationSummary(
      prospect_id,
      conversationResult.rows[0]?.id,
      finalReadinessScore,
      finalCategory,
      websiteAnalysis,
      linkedinValidation,
      budgetAssessment
    );
    
    res.json({
      success: true,
      prospect_id: prospect_id,
      comprehensive_vetting: {
        website_analysis: websiteAnalysis,
        linkedin_validation: linkedinValidation,
        budget_assessment: budgetAssessment,
        final_score: finalReadinessScore,
        final_category: finalCategory
      },
      validation_summary: validationSummary,
      errors: vettingResults.filter(r => r.error).map(r => ({ type: r.type, error: r.error }))
    });
  } catch (error) {
    console.error('Comprehensive vetting error:', error);
    res.status(500).json({ error: 'Comprehensive vetting failed', details: error.message });
  }
});

// GET /api/vetting/validation-summary/:prospectId - Get validation summary
router.get('/validation-summary/:prospectId', auth, async (req, res) => {
  try {
    const prospectId = req.params.prospectId;
    
    const result = await db.query(
      'SELECT * FROM validation_summary WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 1',
      [prospectId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No validation summary found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error retrieving validation summary:', error);
    res.status(500).json({ error: 'Failed to retrieve validation summary' });
  }
});

// GET /api/vetting/stats - Get vetting system statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const stats = await calculateVettingStats();
    res.json(stats);
  } catch (error) {
    console.error('Error calculating vetting stats:', error);
    res.status(500).json({ error: 'Failed to calculate vetting statistics' });
  }
});

// Helper methods
async function calculateComprehensiveScore(prospectId) {
  try {
    const prospect = await db.query(
      'SELECT * FROM prospects WHERE id = $1',
      [prospectId]
    );
    
    if (prospect.rows.length === 0) return 0;
    
    const p = prospect.rows[0];
    let score = 0;
    
    // Base readiness score (40%)
    score += (p.readiness_score || 0) * 0.4;
    
    // Website legitimacy (20%)
    score += (p.legitimacy_score || 0) * 0.2;
    
    // LinkedIn authority (20%)
    score += (p.authority_score || 0) * 0.2;
    
    // Behavioral authenticity (10%)
    score += (p.behavioral_score || 50) * 0.1;
    
    // Budget realism (10%)
    if (p.budget_assessment) {
      const assessment = JSON.parse(p.budget_assessment);
      score += (assessment.internal_assessment?.realism_score || 50) * 0.1;
    } else {
      score += 50 * 0.1; // Neutral score if no assessment
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
  } catch (error) {
    console.error('Error calculating comprehensive score:', error);
    return 0;
  }
}

function determineReadinessCategory(score) {
  if (score >= 80) return 'HOT';
  if (score >= 65) return 'WARM';
  if (score >= 45) return 'COOL';
  return 'COLD';
}

async function createValidationSummary(prospectId, conversationId, finalScore, finalCategory, websiteAnalysis, linkedinValidation, budgetAssessment) {
  try {
    const summaryData = {
      prospect_id: prospectId,
      conversation_id: conversationId,
      final_readiness_score: finalScore,
      final_category: finalCategory,
      confidence_level: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low',
      website_legitimacy_score: websiteAnalysis?.legitimacy_score || 0,
      linkedin_validation_score: linkedinValidation?.overall_validation_score || 0,
      behavioral_authenticity_score: 50, // Default - would be calculated from behavioral analysis
      budget_realism_score: budgetAssessment?.internal_assessment?.realism_score || 50,
      conversation_quality_score: 50, // Default - would be calculated from conversation analysis
      company_verified: linkedinValidation?.company_validation?.company_found || false,
      person_verified: linkedinValidation?.person_validation?.person_found || false,
      website_legitimate: (websiteAnalysis?.legitimacy_score || 0) > 70,
      behavioral_authentic: true, // Default - would be calculated from behavioral analysis
      budget_realistic: (budgetAssessment?.internal_assessment?.realism_score || 50) > 60,
      recommendations: [],
      manual_review_required: finalScore < 30,
      priority_level: finalScore >= 80 ? 'High' : finalScore >= 50 ? 'Normal' : 'Low'
    };
    
    const result = await db.query(
      `INSERT INTO validation_summary (
        prospect_id, conversation_id, final_readiness_score, final_category, confidence_level,
        website_legitimacy_score, linkedin_validation_score, behavioral_authenticity_score,
        budget_realism_score, conversation_quality_score, company_verified, person_verified,
        website_legitimate, behavioral_authentic, budget_realistic, recommendations,
        manual_review_required, priority_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        summaryData.prospect_id, summaryData.conversation_id, summaryData.final_readiness_score,
        summaryData.final_category, summaryData.confidence_level, summaryData.website_legitimacy_score,
        summaryData.linkedin_validation_score, summaryData.behavioral_authenticity_score,
        summaryData.budget_realism_score, summaryData.conversation_quality_score,
        summaryData.company_verified, summaryData.person_verified, summaryData.website_legitimate,
        summaryData.behavioral_authentic, summaryData.budget_realistic,
        JSON.stringify(summaryData.recommendations), summaryData.manual_review_required,
        summaryData.priority_level
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating validation summary:', error);
    return null;
  }
}

async function calculateVettingStats() {
  try {
    const [
      totalProspects,
      vettedProspects,
      categoryBreakdown,
      averageScores
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM prospects'),
      db.query('SELECT COUNT(*) as count FROM validation_summary'),
      db.query(`
        SELECT final_category, COUNT(*) as count 
        FROM validation_summary 
        GROUP BY final_category
      `),
      db.query(`
        SELECT 
          AVG(final_readiness_score) as avg_readiness,
          AVG(website_legitimacy_score) as avg_website,
          AVG(linkedin_validation_score) as avg_linkedin,
          AVG(budget_realism_score) as avg_budget
        FROM validation_summary
      `)
    ]);
    
    return {
      total_prospects: parseInt(totalProspects.rows[0].count),
      vetted_prospects: parseInt(vettedProspects.rows[0].count),
      vetting_completion_rate: (parseInt(vettedProspects.rows[0].count) / parseInt(totalProspects.rows[0].count) * 100).toFixed(1),
      category_breakdown: categoryBreakdown.rows.reduce((acc, row) => {
        acc[row.final_category] = parseInt(row.count);
        return acc;
      }, {}),
      average_scores: {
        readiness: parseFloat(averageScores.rows[0].avg_readiness || 0).toFixed(1),
        website_legitimacy: parseFloat(averageScores.rows[0].avg_website || 0).toFixed(1),
        linkedin_validation: parseFloat(averageScores.rows[0].avg_linkedin || 0).toFixed(1),
        budget_realism: parseFloat(averageScores.rows[0].avg_budget || 0).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Error calculating vetting stats:', error);
    return {
      total_prospects: 0,
      vetted_prospects: 0,
      vetting_completion_rate: '0.0',
      category_breakdown: {},
      average_scores: {}
    };
  }
}

function parseCompanySize(companySizeString) {
  if (!companySizeString) return null;
  
  const sizeMap = {
    '1-10': 5,
    '11-50': 30,
    '51-200': 125,
    '201-500': 350,
    '501-1000': 750,
    '1000+': 2000
  };
  
  return sizeMap[companySizeString] || null;
}

// Attach helper methods to router for access
router.calculateComprehensiveScore = calculateComprehensiveScore;
router.determineReadinessCategory = determineReadinessCategory;
router.createValidationSummary = createValidationSummary;
router.calculateVettingStats = calculateVettingStats;
router.parseCompanySize = parseCompanySize;

module.exports = router;