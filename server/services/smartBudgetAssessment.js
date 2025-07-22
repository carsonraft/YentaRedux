const db = require('../db/pool');
const openai = require('openai');

class SmartBudgetAssessmentService {
  constructor() {
    this.openaiClient = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('Smart Budget Assessment Service initialized');
  }

  async assessBudgetReality(conversationData, companyData, industryBenchmarks) {
    try {
      console.log('💰 Starting budget assessment for:', companyData.company_name);
      
      const budgetAnalysis = await this.analyzeConversationForBudgetSignals(conversationData);
      const companyBudgetProfile = this.createCompanyBudgetProfile(companyData);
      const industryContext = await this.getIndustryBudgetContext(companyData.industry);
      
      const assessment = {
        // Internal detailed assessment (not shared with vendors)
        internal_assessment: {
          indicated_range: budgetAnalysis.stated_range,
          realistic_range: this.validateBudgetRealism(budgetAnalysis, companyBudgetProfile),
          confidence_level: budgetAnalysis.confidence,
          budget_authority_level: budgetAnalysis.authority_indicators,
          approval_complexity: budgetAnalysis.approval_process,
          timeline_pressure: budgetAnalysis.urgency_signals,
          industry_comparison: this.compareToBenchmarks(budgetAnalysis, industryContext),
          realism_score: this.calculateBudgetRealismScore(budgetAnalysis, companyBudgetProfile, industryContext)
        },
        
        // Vendor-visible anonymized categories
        vendor_visible: {
          budget_category: this.mapToVendorCategory(budgetAnalysis, companyBudgetProfile),
          company_size_category: this.mapCompanySizeCategory(companyData.estimated_employee_count || 0),
          investment_seriousness: this.assessInvestmentSeriousness(budgetAnalysis),
          timeline_category: this.mapTimelineCategory(budgetAnalysis.timeline),
          authority_level: this.mapAuthorityCategory(budgetAnalysis.authority_indicators)
        },
        
        // Transparency report for prospect
        transparency_report: {
          what_vendors_see: this.generateVendorVisibilityReport(),
          what_vendors_dont_see: this.generatePrivacyProtectionReport(),
          why_this_helps: this.generateValueExplanation()
        },
        
        assessed_at: new Date().toISOString()
      };

      console.log('✅ Budget assessment completed:', {
        budget_category: assessment.vendor_visible.budget_category,
        realism_score: assessment.internal_assessment.realism_score,
        investment_seriousness: assessment.vendor_visible.investment_seriousness
      });

      return assessment;
    } catch (error) {
      console.error('❌ Budget assessment error:', error);
      return this.getBudgetAssessmentError(error);
    }
  }

  async analyzeConversationForBudgetSignals(conversationData) {
    const conversationText = this.formatConversationForAnalysis(conversationData);
    
    const budgetAnalysisPrompt = `Analyze this AI prospect conversation for budget and investment indicators:

Conversation:
${conversationText}

Extract and assess budget signals with realistic evaluation:

{
  "stated_budget_range": {
    "min": number_or_null,
    "max": number_or_null,
    "currency": "USD",
    "confidence": 0-100,
    "stated_explicitly": boolean
  },
  "implied_budget_signals": {
    "team_size_mentions": ["any team size references"],
    "current_spending_references": ["existing tool/service costs mentioned"],
    "competitor_comparisons": ["pricing references to competitors"],
    "roi_expectations": ["return on investment expectations"],
    "timeline_urgency": ["urgency indicators affecting budget"]
  },
  "authority_indicators": {
    "decision_making_role": boolean,
    "budget_approval_involvement": boolean,
    "procurement_process_awareness": 0-100,
    "stakeholder_mentions": ["other decision makers mentioned"],
    "approval_complexity_signals": ["indicators of approval process complexity"]
  },
  "approval_process_complexity": {
    "estimated_approval_levels": number,
    "estimated_timeline_weeks": number,
    "procurement_sophistication": "high|medium|low",
    "compliance_requirements": ["any compliance/approval requirements mentioned"]
  },
  "urgency_signals": {
    "business_driver_urgency": 0-100,
    "timeline_flexibility": "rigid|moderate|flexible",
    "competitive_pressure": boolean,
    "executive_mandate": boolean
  },
  "realism_assessment": {
    "budget_timeline_alignment": 0-100,
    "expectations_vs_stated_budget": "aligned|optimistic|unrealistic",
    "overall_sophistication": 0-100,
    "red_flags": ["any budget-related red flags"]
  },
  "confidence": 0-100
}

Be realistic in assessment - look for actual budget signals, not wishful thinking.`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: budgetAnalysisPrompt }],
        max_tokens: 1200,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Add derived timeline information
      analysis.timeline = this.extractTimelineFromAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Budget analysis error:', error);
      return this.getDefaultBudgetAnalysis();
    }
  }

  createCompanyBudgetProfile(companyData) {
    const employeeCount = companyData.verified_employee_count || 
                         companyData.estimated_employee_count || 
                         this.estimateEmployeeCountFromSignals(companyData) || 0;
    
    const industry = companyData.industry || 'technology';
    const companyType = companyData.company_type || 'private';

    // Calculate budget capacity based on company characteristics
    const baseBudgetCapacity = this.calculateBaseBudgetCapacity(employeeCount, industry);
    const industryMultiplier = this.getIndustryBudgetMultiplier(industry);
    const companyTypeMultiplier = this.getCompanyTypeMultiplier(companyType);

    return {
      estimated_budget_capacity: Math.round(baseBudgetCapacity * industryMultiplier * companyTypeMultiplier),
      size_category: this.categorizeCompanySize(employeeCount),
      industry_sophistication: this.assessIndustrySophistication(industry),
      budget_tier: this.determineBudgetTier(employeeCount, industry),
      typical_project_range: this.getTypicalProjectRange(employeeCount, industry)
    };
  }

  async getIndustryBudgetContext(industry) {
    try {
      const result = await db.query(
        'SELECT * FROM budget_benchmarks WHERE industry = $1 ORDER BY company_size_min',
        [industry || 'Technology']
      );
      
      return result.rows.length > 0 ? result.rows : await this.getDefaultBenchmarks();
    } catch (error) {
      console.error('Error fetching industry benchmarks:', error);
      return await this.getDefaultBenchmarks();
    }
  }

  async getDefaultBenchmarks() {
    try {
      const result = await db.query(
        'SELECT * FROM budget_benchmarks WHERE industry = $1 ORDER BY company_size_min',
        ['Technology']
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching default benchmarks:', error);
      return this.getHardcodedBenchmarks();
    }
  }

  getHardcodedBenchmarks() {
    return [
      { company_size_min: 10, company_size_max: 50, typical_budget_min: 25000, typical_budget_max: 100000 },
      { company_size_min: 50, company_size_max: 200, typical_budget_min: 75000, typical_budget_max: 300000 },
      { company_size_min: 200, company_size_max: 1000, typical_budget_min: 200000, typical_budget_max: 800000 },
      { company_size_min: 1000, company_size_max: 10000, typical_budget_min: 500000, typical_budget_max: 2000000 }
    ];
  }

  validateBudgetRealism(budgetAnalysis, companyProfile) {
    const statedBudget = budgetAnalysis.stated_budget_range;
    const companyCapacity = companyProfile.estimated_budget_capacity;
    const typicalRange = companyProfile.typical_project_range;

    if (!statedBudget.min || !statedBudget.max) {
      return {
        realistic_min: typicalRange.min,
        realistic_max: typicalRange.max,
        confidence: 'estimated_from_company_profile',
        realism_score: 50,
        adjustment_reason: 'no_stated_budget'
      };
    }

    // Check if stated budget aligns with company capacity
    const budgetCapacityRatio = statedBudget.max / companyCapacity;
    let realismScore = 100;
    let adjustmentReason = 'aligned';

    if (budgetCapacityRatio > 2) {
      realismScore -= 40; // Stated budget seems too high for company size
      adjustmentReason = 'stated_too_high';
    } else if (budgetCapacityRatio < 0.1) {
      realismScore -= 30; // Stated budget seems too low for meaningful AI project
      adjustmentReason = 'stated_too_low';
    }

    // Check timeline alignment
    if (budgetAnalysis.realism_assessment?.budget_timeline_alignment < 50) {
      realismScore -= 20;
    }

    return {
      realistic_min: Math.max(statedBudget.min, typicalRange.min * 0.5),
      realistic_max: Math.min(statedBudget.max, companyCapacity),
      confidence: realismScore > 70 ? 'high' : realismScore > 40 ? 'medium' : 'low',
      realism_score: Math.max(0, Math.min(100, realismScore)),
      capacity_vs_stated: budgetCapacityRatio,
      adjustment_reason: adjustmentReason
    };
  }

  calculateBudgetRealismScore(budgetAnalysis, companyProfile, industryContext) {
    let score = 50; // Start neutral

    // Stated budget realism (30 points)
    const realismValidation = this.validateBudgetRealism(budgetAnalysis, companyProfile);
    score += (realismValidation.realism_score - 50) * 0.6; // -30 to +30 points

    // Authority and approval process (25 points)
    const authorityScore = budgetAnalysis.authority_indicators?.procurement_process_awareness || 0;
    score += (authorityScore - 50) * 0.5; // -25 to +25 points

    // Timeline realism (20 points)
    const timelineScore = budgetAnalysis.realism_assessment?.budget_timeline_alignment || 50;
    score += (timelineScore - 50) * 0.4; // -20 to +20 points

    // Investment seriousness (15 points)
    const urgencyScore = budgetAnalysis.urgency_signals?.business_driver_urgency || 0;
    score += urgencyScore * 0.15; // 0 to +15 points

    // Industry alignment (10 points)
    const industryAlignment = this.checkIndustryBudgetAlignment(budgetAnalysis, companyProfile, industryContext);
    score += industryAlignment.adjustment;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  checkIndustryBudgetAlignment(budgetAnalysis, companyProfile, industryContext) {
    const employeeCount = companyProfile.size_category === 'startup' ? 25 : 
                         companyProfile.size_category === 'growth' ? 125 : 
                         companyProfile.size_category === 'mid_market' ? 500 : 2000;

    const relevantBenchmark = industryContext.find(benchmark => 
      employeeCount >= benchmark.company_size_min && employeeCount <= benchmark.company_size_max
    ) || industryContext[0];

    if (!relevantBenchmark || !budgetAnalysis.stated_budget_range?.max) {
      return { adjustment: 0, alignment: 'unknown' };
    }

    const statedMax = budgetAnalysis.stated_budget_range.max;
    const benchmarkMin = parseFloat(relevantBenchmark.typical_budget_min);
    const benchmarkMax = parseFloat(relevantBenchmark.typical_budget_max);

    if (statedMax >= benchmarkMin && statedMax <= benchmarkMax) {
      return { adjustment: 10, alignment: 'well_aligned' };
    } else if (statedMax < benchmarkMin * 0.5) {
      return { adjustment: -5, alignment: 'below_industry_norm' };
    } else if (statedMax > benchmarkMax * 2) {
      return { adjustment: -5, alignment: 'above_industry_norm' };
    }

    return { adjustment: 0, alignment: 'moderate_alignment' };
  }

  // Budget capacity calculation methods
  calculateBaseBudgetCapacity(employeeCount, industry) {
    // Base calculation: $2000-5000 per employee for AI projects
    const basePerEmployee = industry === 'Technology' ? 4000 : 
                           industry === 'Financial Services' ? 5000 :
                           industry === 'Healthcare' ? 3500 : 2000;
    
    // Apply scaling factor for larger companies (economies of scale)
    let scalingFactor = 1;
    if (employeeCount > 1000) scalingFactor = 0.7;
    else if (employeeCount > 200) scalingFactor = 0.8;
    else if (employeeCount > 50) scalingFactor = 0.9;

    return Math.round(employeeCount * basePerEmployee * scalingFactor);
  }

  getIndustryBudgetMultiplier(industry) {
    const multipliers = {
      'Financial Services': 1.4,
      'Healthcare': 1.2,
      'Technology': 1.0,
      'Manufacturing': 0.8,
      'Retail': 0.7,
      'Education': 0.6
    };
    return multipliers[industry] || 1.0;
  }

  getCompanyTypeMultiplier(companyType) {
    const multipliers = {
      'public': 1.3,
      'private': 1.0,
      'nonprofit': 0.5,
      'partnership': 0.8
    };
    return multipliers[companyType] || 1.0;
  }

  categorizeCompanySize(employeeCount) {
    if (employeeCount < 50) return 'startup';
    if (employeeCount < 200) return 'growth';
    if (employeeCount < 1000) return 'mid_market';
    return 'enterprise';
  }

  determineBudgetTier(employeeCount, industry) {
    const capacity = this.calculateBaseBudgetCapacity(employeeCount, industry);
    const multiplier = this.getIndustryBudgetMultiplier(industry);
    const totalCapacity = capacity * multiplier;

    if (totalCapacity < 100000) return 'Startup';
    if (totalCapacity < 300000) return 'Growth';
    if (totalCapacity < 800000) return 'Mid-Market';
    return 'Enterprise';
  }

  getTypicalProjectRange(employeeCount, industry) {
    const tier = this.determineBudgetTier(employeeCount, industry);
    const ranges = {
      'Startup': { min: 25000, max: 100000 },
      'Growth': { min: 75000, max: 300000 },
      'Mid-Market': { min: 200000, max: 800000 },
      'Enterprise': { min: 500000, max: 2000000 }
    };
    return ranges[tier];
  }

  // Vendor category mapping methods
  mapToVendorCategory(budgetAnalysis, companyProfile) {
    const realisticRange = this.validateBudgetRealism(budgetAnalysis, companyProfile);
    return this.determineBudgetTier(0, 'Technology'); // Use existing logic
  }

  mapCompanySizeCategory(employeeCount) {
    if (employeeCount < 50) return '10-50 employees';
    if (employeeCount < 200) return '50-200 employees';
    if (employeeCount < 1000) return '200-1000 employees';
    return '1000+ employees';
  }

  assessInvestmentSeriousness(budgetAnalysis) {
    let score = 0;
    
    // Authority indicators (40 points)
    if (budgetAnalysis.authority_indicators?.decision_making_role) score += 20;
    if (budgetAnalysis.authority_indicators?.budget_approval_involvement) score += 20;
    
    // Urgency signals (30 points)
    score += (budgetAnalysis.urgency_signals?.business_driver_urgency || 0) * 0.3;
    
    // Budget specificity (20 points)
    if (budgetAnalysis.stated_budget_range?.stated_explicitly) score += 20;
    
    // Timeline clarity (10 points)
    if (budgetAnalysis.urgency_signals?.timeline_flexibility === 'rigid') score += 10;

    if (score >= 80) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
  }

  mapTimelineCategory(timeline) {
    if (!timeline?.urgency) return 'Exploring';
    if (timeline.urgency >= 80) return 'Immediate';
    if (timeline.urgency >= 50) return 'Planned';
    return 'Exploring';
  }

  mapAuthorityCategory(authorityIndicators) {
    if (!authorityIndicators) return 'To Be Determined';
    
    const score = (authorityIndicators.procurement_process_awareness || 0) +
                  (authorityIndicators.decision_making_role ? 30 : 0) +
                  (authorityIndicators.budget_approval_involvement ? 20 : 0);
    
    if (score >= 80) return 'Budget Authority';
    if (score >= 50) return 'Involved in Decision';
    return 'Influencer';
  }

  // Helper methods
  formatConversationForAnalysis(conversationData) {
    if (conversationData.messages) {
      return conversationData.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
    return JSON.stringify(conversationData);
  }

  extractTimelineFromAnalysis(analysis) {
    return {
      urgency: analysis.urgency_signals?.business_driver_urgency || 0,
      flexibility: analysis.urgency_signals?.timeline_flexibility || 'flexible',
      estimated_weeks: analysis.approval_process_complexity?.estimated_timeline_weeks || 12
    };
  }

  estimateEmployeeCountFromSignals(companyData) {
    // Try to extract from various company data sources
    if (companyData.website_intelligence?.business_indicators?.employee_count_signals) {
      return this.parseEmployeeCountFromSignals(companyData.website_intelligence.business_indicators.employee_count_signals);
    }
    return null;
  }

  parseEmployeeCountFromSignals(signals) {
    // Simple heuristic - could be enhanced with AI
    if (signals.includes('small team') || signals.includes('startup')) return 15;
    if (signals.includes('growing team')) return 75;
    if (signals.includes('enterprise') || signals.includes('large organization')) return 500;
    return null;
  }

  assessIndustrySophistication(industry) {
    const sophisticationLevels = {
      'Technology': 90,
      'Financial Services': 85,
      'Healthcare': 75,
      'Manufacturing': 65,
      'Retail': 60,
      'Education': 55
    };
    return sophisticationLevels[industry] || 60;
  }

  // Report generation methods
  generateVendorVisibilityReport() {
    return {
      budget_category: "General category like 'Mid-Market Budget' - not specific numbers",
      company_size: "Size category like '200-1000 employees' - not exact count",
      timeline_urgency: "General urgency like 'High Priority' - not specific dates",
      authority_level: "Decision involvement like 'Budget Authority' - not specific role",
      investment_seriousness: "Commitment level like 'High' - not financial details"
    };
  }

  generatePrivacyProtectionReport() {
    return {
      never_shared: [
        "Your specific budget numbers ($X to $Y)",
        "Your company's exact revenue or financial data", 
        "Specific salary or compensation information",
        "Detailed financial constraints or limitations",
        "Competitive budget information from other companies"
      ],
      anonymization_process: "All financial information is converted to general categories before vendors see it",
      data_retention: "Specific budget numbers are encrypted and only accessible to AI matching algorithms"
    };
  }

  generateValueExplanation() {
    return {
      vendor_matching: "Ensures you meet with vendors who regularly work with companies your size",
      pricing_alignment: "Vendors can propose solutions appropriate for your budget tier",
      time_savings: "Reduces meetings with vendors whose solutions don't fit your investment range",
      better_proposals: "Vendors come prepared with relevant case studies and pricing models"
    };
  }

  getDefaultBudgetAnalysis() {
    return {
      stated_budget_range: { min: null, max: null, confidence: 0 },
      authority_indicators: { procurement_process_awareness: 50 },
      urgency_signals: { business_driver_urgency: 50 },
      realism_assessment: { budget_timeline_alignment: 50 },
      confidence: 30,
      timeline: { urgency: 50, flexibility: 'moderate' }
    };
  }

  getBudgetAssessmentError(error) {
    return {
      success: false,
      error: true,
      error_message: error.message,
      internal_assessment: {
        realism_score: 0,
        confidence_level: 'low'
      },
      vendor_visible: {
        budget_category: 'Assessment Error',
        investment_seriousness: 'Unknown'
      }
    };
  }
}

module.exports = new SmartBudgetAssessmentService();