const db = require('../db/pool');
const WebsiteIntelligenceService = require('./websiteIntelligence');
const SmartBudgetAssessmentService = require('./smartBudgetAssessment');
const OpenAIService = require('./openai');

/**
 * VettingOrchestrator - The conductor of the vetting symphony
 * Coordinates all validation services and manages context between rounds
 */
class VettingOrchestrator {
  constructor() {
    this.websiteIntelligence = new WebsiteIntelligenceService();
    this.budgetAssessment = new SmartBudgetAssessmentService();
    this.openai = new OpenAIService();
  }

  /**
   * Main orchestration method - called after each conversation round
   */
  async orchestrateRoundVetting(conversationId, roundNumber) {
    console.log(`🎭 Orchestrating vetting for conversation ${conversationId}, round ${roundNumber}`);
    
    try {
      // 1. Get conversation data and extracted info
      const conversationData = await this.getConversationData(conversationId, roundNumber);
      if (!conversationData) {
        console.error('No conversation data found');
        return null;
      }

      const { messages, extractedData, prospectId } = conversationData;

      // 2. Create round summary
      const roundSummary = await this.createRoundSummary(messages, extractedData);
      
      // 3. Run validation services
      const validationResults = await this.runValidationServices(extractedData, messages);
      
      // 4. Calculate aggregate scores
      const aggregateScores = this.calculateAggregateScores(validationResults);
      
      // 5. Store validation summary
      await this.storeValidationSummary(prospectId, conversationId, roundNumber, {
        ...validationResults,
        ...aggregateScores,
        roundSummary
      });
      
      // 6. Update conversation round with summary and scores
      await this.updateConversationRound(conversationId, roundNumber, {
        ai_summary: roundSummary,
        round_score: aggregateScores.overallScore,
        key_insights: this.extractKeyInsights(extractedData)
      });
      
      // 7. Prepare context for next round
      const nextRoundContext = await this.prepareNextRoundContext(conversationId, roundNumber, extractedData);
      
      return {
        summary: roundSummary,
        scores: aggregateScores,
        validationResults,
        nextRoundContext
      };
      
    } catch (error) {
      console.error('Orchestration error:', error);
      throw error;
    }
  }

  /**
   * Get conversation data from database
   */
  async getConversationData(conversationId, roundNumber) {
    try {
      // Get conversation round data
      const roundResult = await db.query(
        `SELECT cr.*, p.id as prospect_id, p.company_name, p.contact_name
         FROM conversation_rounds cr
         JOIN prospects p ON cr.prospect_id = p.id
         WHERE cr.conversation_id = $1 AND cr.round_number = $2`,
        [conversationId, roundNumber]
      );

      if (roundResult.rows.length === 0) return null;

      const round = roundResult.rows[0];
      
      // Get extracted data if available
      let extractedData = {};
      if (round.messages && round.messages.length > 0) {
        // Get the latest extraction for this round
        const lastUserMessage = round.messages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
          extractedData = lastUserMessage.extractedData || {};
        }
      }

      return {
        messages: round.messages || [],
        extractedData,
        prospectId: round.prospect_id,
        companyName: round.company_name,
        contactName: round.contact_name
      };
    } catch (error) {
      console.error('Error getting conversation data:', error);
      throw error;
    }
  }

  /**
   * Create AI-powered summary of the round
   */
  async createRoundSummary(messages, extractedData) {
    const summaryPrompt = `Create a concise summary of this conversation round.

Messages:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Create a 2-3 sentence summary highlighting:
1. The main business problem/need identified
2. Key details about the company/prospect
3. Any important requirements or constraints discovered`;

    try {
      const response = await this.openai.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: 'You are an expert at creating concise business summaries.' },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error creating summary:', error);
      return 'Unable to generate summary';
    }
  }

  /**
   * Run all validation services
   */
  async runValidationServices(extractedData, messages) {
    const results = {
      websiteValidation: null,
      budgetAssessment: null
    };

    // Website validation
    if (extractedData.artifacts?.companyWebsite) {
      console.log('🌐 Running website validation...');
      try {
        results.websiteValidation = await this.websiteIntelligence.analyzeWebsite(
          extractedData.artifacts.companyWebsite
        );
      } catch (error) {
        console.error('Website validation error:', error);
        results.websiteValidation = { 
          legitimacy_score: 0, 
          error: 'Failed to analyze website' 
        };
      }
    }

    // Budget assessment
    console.log('💰 Running budget assessment...');
    try {
      results.budgetAssessment = await this.budgetAssessment.analyzeConversation(
        messages,
        {
          industry: extractedData.structured?.industry || 'unknown',
          company_size: extractedData.structured?.teamSize || 'unknown'
        }
      );
    } catch (error) {
      console.error('Budget assessment error:', error);
      results.budgetAssessment = { 
        budget_realism_score: 50,
        error: 'Failed to assess budget' 
      };
    }

    return results;
  }

  /**
   * Calculate aggregate scores
   */
  calculateAggregateScores(validationResults) {
    let totalScore = 0;
    let scoreCount = 0;

    // Website score (0-100)
    if (validationResults.websiteValidation?.legitimacy_score !== undefined) {
      totalScore += validationResults.websiteValidation.legitimacy_score;
      scoreCount++;
    }

    // Budget score (0-100)
    if (validationResults.budgetAssessment?.budget_realism_score !== undefined) {
      totalScore += validationResults.budgetAssessment.budget_realism_score;
      scoreCount++;
    }

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;
    
    // Determine readiness category
    let category = 'UNKNOWN';
    if (overallScore >= 80) category = 'HOT';
    else if (overallScore >= 65) category = 'WARM';
    else if (overallScore >= 40) category = 'COOL';
    else category = 'COLD';

    return {
      overallScore,
      category,
      confidenceLevel: scoreCount > 0 ? 'HIGH' : 'LOW'
    };
  }

  /**
   * Store validation summary in database
   */
  async storeValidationSummary(prospectId, conversationId, roundNumber, summary) {
    try {
      await db.query(
        `INSERT INTO validation_summary 
         (prospect_id, conversation_id, round_number, final_readiness_score, 
          final_category, confidence_level, website_legitimacy_score, 
          budget_realism_score, validation_timestamp, full_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
         ON CONFLICT (prospect_id, round_number) 
         DO UPDATE SET 
           final_readiness_score = EXCLUDED.final_readiness_score,
           final_category = EXCLUDED.final_category,
           confidence_level = EXCLUDED.confidence_level,
           website_legitimacy_score = EXCLUDED.website_legitimacy_score,
           budget_realism_score = EXCLUDED.budget_realism_score,
           validation_timestamp = NOW(),
           full_summary = EXCLUDED.full_summary`,
        [
          prospectId,
          conversationId,
          roundNumber,
          summary.overallScore,
          summary.category,
          summary.confidenceLevel,
          summary.websiteValidation?.legitimacy_score || null,
          summary.budgetAssessment?.budget_realism_score || null,
          JSON.stringify(summary)
        ]
      );
    } catch (error) {
      console.error('Error storing validation summary:', error);
      throw error;
    }
  }

  /**
   * Update conversation round with summary and insights
   */
  async updateConversationRound(conversationId, roundNumber, updates) {
    try {
      await db.query(
        `UPDATE conversation_rounds 
         SET ai_summary = $1, round_score = $2, key_insights = $3
         WHERE conversation_id = $4 AND round_number = $5`,
        [
          updates.ai_summary,
          updates.round_score,
          JSON.stringify(updates.key_insights),
          conversationId,
          roundNumber
        ]
      );
    } catch (error) {
      console.error('Error updating conversation round:', error);
      throw error;
    }
  }

  /**
   * Extract key insights from the data
   */
  extractKeyInsights(extractedData) {
    const insights = [];
    
    if (extractedData.structured?.industry) {
      insights.push(`Industry: ${extractedData.structured.industry}`);
    }
    if (extractedData.structured?.problemType) {
      insights.push(`Problem: ${extractedData.structured.problemType}`);
    }
    if (extractedData.context?.budgetContext) {
      insights.push(`Budget: ${extractedData.context.budgetContext}`);
    }
    if (extractedData.structured?.businessUrgency) {
      insights.push(`Timeline: ${extractedData.structured.businessUrgency}`);
    }
    
    return insights;
  }

  /**
   * Prepare context for the next round
   */
  async prepareNextRoundContext(conversationId, currentRound, extractedData) {
    // Get all previous round summaries
    const previousRounds = await db.query(
      `SELECT round_number, ai_summary, key_insights
       FROM conversation_rounds
       WHERE conversation_id = $1 AND round_number <= $2
       ORDER BY round_number`,
      [conversationId, currentRound]
    );

    const context = {
      previousRounds: previousRounds.rows.map(r => ({
        round: r.round_number,
        summary: r.ai_summary,
        insights: r.key_insights
      })),
      currentData: {
        industry: extractedData.structured?.industry,
        problemType: extractedData.structured?.problemType,
        businessUrgency: extractedData.structured?.businessUrgency,
        budgetStatus: extractedData.structured?.budgetStatus,
        companyWebsite: extractedData.artifacts?.companyWebsite
      }
    };

    return context;
  }
}

module.exports = VettingOrchestrator;

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>