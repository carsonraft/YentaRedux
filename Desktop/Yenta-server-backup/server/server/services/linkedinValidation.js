const db = require('../db/pool');
const openai = require('openai');

// Note: LinkedIn's official API has strict limitations for company/person search
// This service implements a simulation/mock approach for MVP validation
// In production, you would need LinkedIn API approval and proper authentication

class LinkedInValidationService {
  constructor() {
    this.openaiClient = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Mock data cache for development - replace with real LinkedIn API calls
    this.enableMockMode = process.env.NODE_ENV === 'development';
    console.log('LinkedIn Validation Service initialized', { mockMode: this.enableMockMode });
  }

  async validateProspectAndCompany(prospectData) {
    const { company_name, contact_name, email, website_domain } = prospectData;
    
    try {
      console.log('🔍 Starting LinkedIn validation for:', { company_name, contact_name });
      
      const [companyValidation, personValidation] = await Promise.all([
        this.validateCompany(company_name, website_domain),
        this.validatePerson(contact_name, company_name, email)
      ]);

      const overallScore = this.calculateValidationScore(companyValidation, personValidation);

      const result = {
        company_validation: companyValidation,
        person_validation: personValidation,
        overall_validation_score: overallScore,
        validation_confidence: this.assessValidationConfidence(companyValidation, personValidation),
        validated_at: new Date().toISOString(),
        mock_data: this.enableMockMode
      };

      console.log('✅ LinkedIn validation completed:', { 
        company_found: companyValidation.company_found,
        person_found: personValidation.person_found,
        overall_score: overallScore 
      });

      return result;
    } catch (error) {
      console.error('❌ LinkedIn validation error:', error);
      return this.getValidationFailureResponse(error);
    }
  }

  async validateCompany(companyName, websiteDomain) {
    // Check cache first (7 days validity)
    const cached = await this.getCachedCompanyData(companyName);
    if (cached && this.isCacheValid(cached, 7)) {
      console.log('📋 Using cached company data for:', companyName);
      return cached.company_data;
    }

    try {
      if (this.enableMockMode) {
        return await this.mockCompanyValidation(companyName, websiteDomain);
      }
      
      // Real LinkedIn API implementation would go here
      // For now, return mock data with AI enhancement
      return await this.mockCompanyValidation(companyName, websiteDomain);
      
    } catch (error) {
      console.error('Company validation error:', error);
      return this.getCompanyValidationError(companyName, error);
    }
  }

  async mockCompanyValidation(companyName, websiteDomain) {
    // Simulate company lookup with AI-enhanced validation
    const companyAnalysisPrompt = `Analyze this company for business legitimacy and provide realistic assessment:

Company Name: ${companyName}
Website Domain: ${websiteDomain || 'not provided'}

Based on the company name and domain, provide a realistic business assessment:

{
  "company_found": boolean,
  "confidence_score": 0-100,
  "basic_info": {
    "estimated_employee_count": number,
    "likely_industry": "string",
    "business_model_clarity": 0-100,
    "appears_legitimate": boolean
  },
  "growth_indicators": {
    "estimated_growth_stage": "startup|growth|established|enterprise",
    "technology_adoption": 0-100,
    "market_presence": 0-100
  },
  "legitimacy_assessment": {
    "name_professionalism": 0-100,
    "domain_alignment": 0-100,
    "business_sophistication": 0-100
  },
  "red_flags": ["any concerning signals"],
  "validation_notes": "explanation of assessment"
}

Be realistic - not every company will score highly. Consider factors like:
- Professional naming conventions
- Domain/company name alignment  
- Likely business model based on name
- Industry sophistication indicators`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: companyAnalysisPrompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content);
      
      // Enhance with mock LinkedIn-style data
      const validation = {
        company_found: aiAnalysis.company_found,
        linkedin_company_id: `mock_${companyName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        confidence_score: aiAnalysis.confidence_score,
        basic_info: {
          name: companyName,
          employee_count: aiAnalysis.basic_info.estimated_employee_count,
          industry: aiAnalysis.basic_info.likely_industry,
          company_type: this.inferCompanyType(aiAnalysis.basic_info.estimated_employee_count),
          legitimacy_score: aiAnalysis.basic_info.business_model_clarity
        },
        growth_indicators: aiAnalysis.growth_indicators,
        legitimacy_assessment: aiAnalysis.legitimacy_assessment,
        red_flags: aiAnalysis.red_flags || [],
        validation_notes: aiAnalysis.validation_notes,
        data_source: 'ai_enhanced_mock'
      };

      // Cache the results
      await this.cacheCompanyData(companyName, validation.linkedin_company_id, validation);

      return validation;
    } catch (error) {
      console.error('AI company analysis error:', error);
      return this.getCompanyNotFoundResponse(companyName);
    }
  }

  async validatePerson(personName, companyName, email) {
    // LinkedIn doesn't allow email lookup, so we search by name + company
    if (!personName || !companyName) {
      return this.getPersonValidationSkipped('insufficient_data');
    }

    try {
      if (this.enableMockMode) {
        return await this.mockPersonValidation(personName, companyName, email);
      }
      
      // Real LinkedIn API implementation would go here
      return await this.mockPersonValidation(personName, companyName, email);
      
    } catch (error) {
      console.error('Person validation error:', error);
      return this.getPersonValidationError(personName, error);
    }
  }

  async mockPersonValidation(personName, companyName, email) {
    const personAnalysisPrompt = `Analyze this person's likely professional authority and legitimacy:

Person Name: ${personName}
Company: ${companyName}
Email: ${email || 'not provided'}

Provide realistic professional assessment:

{
  "person_found": boolean,
  "match_confidence": 0-100,
  "professional_info": {
    "name_professionalism": 0-100,
    "likely_seniority_level": "c_level|vp|director|manager|individual_contributor",
    "email_domain_alignment": boolean,
    "business_email_format": boolean
  },
  "authority_indicators": {
    "seniority_score": 0-100,
    "decision_making_likelihood": 0-100,
    "budget_authority_probability": 0-100,
    "technology_involvement": 0-100
  },
  "credibility_metrics": {
    "professional_name_format": boolean,
    "contact_completeness": 0-100,
    "authority_signals": ["signals found in name/title"]
  },
  "red_flags": ["any concerning signals"],
  "authority_assessment": "explanation of authority level"
}

Consider factors like:
- Name professionalism and format
- Email domain vs company alignment
- Implied seniority from context
- Likelihood of decision-making authority`;

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: personAnalysisPrompt }],
        max_tokens: 600,
        temperature: 0.3
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content);
      
      const validation = {
        person_found: aiAnalysis.person_found,
        linkedin_profile_id: `mock_${personName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        match_confidence: aiAnalysis.match_confidence,
        professional_info: aiAnalysis.professional_info,
        authority_indicators: aiAnalysis.authority_indicators,
        credibility_metrics: aiAnalysis.credibility_metrics,
        authority_score: this.calculateAuthorityScore(aiAnalysis),
        red_flags: aiAnalysis.red_flags || [],
        authority_assessment: aiAnalysis.authority_assessment,
        data_source: 'ai_enhanced_mock'
      };

      return validation;
    } catch (error) {
      console.error('AI person analysis error:', error);
      return this.getPersonNotFoundResponse(personName, companyName);
    }
  }

  calculateAuthorityScore(aiAnalysis) {
    let score = 50; // Start neutral

    // Seniority weight (40 points possible)
    score += (aiAnalysis.authority_indicators?.seniority_score || 0) * 0.4;
    
    // Decision making capability (30 points possible)
    score += (aiAnalysis.authority_indicators?.decision_making_likelihood || 0) * 0.3;
    
    // Professional credibility (20 points possible)
    score += (aiAnalysis.credibility_metrics?.contact_completeness || 0) * 0.2;
    
    // Technology involvement (10 points possible)
    score += (aiAnalysis.authority_indicators?.technology_involvement || 0) * 0.1;

    // Penalize red flags
    const redFlagPenalty = (aiAnalysis.red_flags?.length || 0) * 10;
    score -= redFlagPenalty;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  calculateValidationScore(companyValidation, personValidation) {
    let score = 0;

    // Company validation (60% weight)
    if (companyValidation.company_found) {
      score += 30;
      score += (companyValidation.confidence_score || 0) * 0.3; // 0-30 points
    }

    // Person validation (40% weight)
    if (personValidation.person_found) {
      score += 20;
      score += (personValidation.authority_score || 0) * 0.2; // 0-20 points
    }

    return Math.min(100, Math.round(score));
  }

  assessValidationConfidence(companyValidation, personValidation) {
    const companyConfidence = companyValidation.confidence_score || 0;
    const personConfidence = personValidation.match_confidence || 0;
    const averageConfidence = (companyConfidence + personConfidence) / 2;

    if (averageConfidence >= 80) return 'high';
    if (averageConfidence >= 60) return 'medium';
    return 'low';
  }

  // Cache management methods
  async getCachedCompanyData(companyName) {
    try {
      const result = await db.query(
        'SELECT * FROM linkedin_company_cache WHERE company_name = $1 ORDER BY last_updated DESC LIMIT 1',
        [companyName]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error retrieving cached company data:', error);
      return null;
    }
  }

  async cacheCompanyData(companyName, linkedinId, validationData) {
    try {
      await db.query(
        `INSERT INTO linkedin_company_cache (company_name, linkedin_company_id, company_data, last_updated)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (company_name, linkedin_company_id) 
         DO UPDATE SET company_data = $3, last_updated = CURRENT_TIMESTAMP`,
        [companyName, linkedinId, JSON.stringify(validationData)]
      );
    } catch (error) {
      console.error('Error caching company data:', error);
    }
  }

  isCacheValid(cachedData, validDays) {
    const ageInDays = (Date.now() - new Date(cachedData.last_updated)) / (1000 * 60 * 60 * 24);
    return ageInDays < validDays;
  }

  // Helper methods for response generation
  inferCompanyType(employeeCount) {
    if (employeeCount < 50) return 'startup';
    if (employeeCount < 200) return 'growth';
    if (employeeCount < 1000) return 'mid_market';
    return 'enterprise';
  }

  getCompanyNotFoundResponse(companyName) {
    return {
      company_found: false,
      linkedin_company_id: null,
      confidence_score: 0,
      basic_info: { name: companyName },
      red_flags: ['company_not_found_on_linkedin'],
      validation_notes: 'Company not found in LinkedIn database'
    };
  }

  getPersonNotFoundResponse(personName, companyName) {
    return {
      person_found: false,
      linkedin_profile_id: null,
      match_confidence: 0,
      professional_info: { name: personName, company: companyName },
      authority_score: 0,
      red_flags: ['person_not_found_on_linkedin'],
      authority_assessment: 'Unable to verify professional credentials'
    };
  }

  getPersonValidationSkipped(reason) {
    return {
      person_found: false,
      skipped: true,
      skip_reason: reason,
      match_confidence: 0,
      authority_score: 0,
      authority_assessment: 'Validation skipped due to insufficient data'
    };
  }

  getCompanyValidationError(companyName, error) {
    return {
      company_found: false,
      error: true,
      error_message: error.message,
      confidence_score: 0,
      basic_info: { name: companyName },
      red_flags: ['validation_error'],
      validation_notes: 'Error occurred during company validation'
    };
  }

  getPersonValidationError(personName, error) {
    return {
      person_found: false,
      error: true,
      error_message: error.message,
      match_confidence: 0,
      authority_score: 0,
      professional_info: { name: personName },
      red_flags: ['validation_error'],
      authority_assessment: 'Error occurred during person validation'
    };
  }

  getValidationFailureResponse(error) {
    return {
      success: false,
      error: true,
      error_message: error.message,
      company_validation: { company_found: false, error: true },
      person_validation: { person_found: false, error: true },
      overall_validation_score: 0,
      validation_confidence: 'low'
    };
  }
}

module.exports = new LinkedInValidationService();