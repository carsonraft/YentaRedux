const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Note: Services integrated via API routes to avoid circular dependencies

// System prompts (imported from our prompts system)
const INTAKE_SYSTEM_PROMPT = `You are an AI assistant helping qualify businesses for AI implementation projects. 
Your goal is to understand their REAL readiness, not just interest.

Guidelines:
- Be conversational, not formal
- Ask follow-up questions to dig deeper
- Detect vague answers and probe for specifics
- Identify budget, timeline, and use case clarity
- Flag copy-paste or generic responses

Start with: "Hi! I'm here to understand your AI project needs. What specific business problem are you trying to solve with AI?"`;

const FOLLOW_UP_PROMPT = `Based on their response, ask the MOST important clarifying question.

If they mention:
- General interest → Ask for specific use case
- Use case but no timeline → Ask about urgency/timeline
- Timeline but no budget → Ask about budget range
- All basics covered → Ask about technical requirements
- Vague answers → Ask for concrete examples

Previous response: {user_response}

Generate ONE follow-up question that digs deeper.`;

const AI_READINESS_PROMPT = `Score this prospect's AI readiness based on their conversation.

Conversation: {full_conversation}

Scoring Rubric:
1. **Budget Reality (0-25)**
   - 20-25: Specific budget mentioned or clear enterprise priority
   - 10-19: Indirect budget indicators (team size, current spend)
   - 0-9: No budget indicators or "just exploring"

2. **Use Case Clarity (0-25)**
   - 20-25: Specific problem, measurable goals, data identified
   - 10-19: General use case but missing key details
   - 0-9: Vague ideas, buzzwords, no clear problem

3. **Timeline Urgency (0-25)**
   - 20-25: Launching in <6 months, executive mandate
   - 10-19: 6-12 month timeline, active project
   - 0-9: "Someday", "exploring", 3-4 years away

4. **Technical Readiness (0-25)**
   - 20-25: Data infrastructure ready, technical team in place
   - 10-19: Some technical capability, gaps identified
   - 0-9: No technical discussion, unrealistic expectations

Total Score Interpretation:
- 80-100: HOT - Ready now, book meetings immediately
- 60-79: WARM - Worth pursuing, needs some education
- 40-59: COOL - 6-12 months away, nurture
- 0-39: COLD - 3-4 years away, don't waste vendor time

Return JSON with scores, total, interpretation, and key evidence quotes.`;

const VENDOR_MATCH_PROMPT = `Match this prospect with the best vendors.

PROSPECT NEEDS:
{prospect_summary}
- Industry: {industry}
- Use Case: {use_case}
- Budget Range: {budget}
- Timeline: {timeline}
- Technical Requirements: {requirements}

AVAILABLE VENDORS:
{vendor_list_json}

For each vendor, provide:
1. Match Score (0-100)
2. Top 3 reasons they match
3. Potential concerns
4. Suggested talking points

Prioritize vendors who:
- Have proven experience in prospect's industry
- Solved similar use cases
- Fit the budget range
- Can deliver in timeline

Return top 5 matches ranked by score.`;

// Enhanced prompts for multi-round conversations
const ROUND_1_SYSTEM_PROMPT = `You are conducting Round 1 of AI project qualification: PROJECT DISCOVERY.

Goals:
- Identify specific business problem and pain points
- Understand current processes and their limitations
- Assess initial urgency and business impact
- Establish communication quality baseline

Guidelines:
- Ask 2-3 focused questions maximum
- Probe for specific examples, not generalities
- If they give vague answers, ask "Can you give me a specific example?"
- Focus on the WHAT and WHY, save technical details for Round 2
- End with: "Thanks! I'd like to dive deeper into the technical side in our next conversation."

Start with: "Let's explore your AI project needs. What specific business challenge is driving your interest in AI solutions?"`;

const ROUND_2_SYSTEM_PROMPT = `You are conducting Round 2 of AI project qualification: TECHNICAL DEPTH VALIDATION.

Goals:
- Assess technical infrastructure and team readiness
- Understand integration requirements and constraints
- Validate team capability and involvement
- Probe implementation experience

Guidelines:
- Reference their Round 1 responses to show continuity
- Ask about current data infrastructure, team structure
- Probe for technical decision makers and their involvement
- Ask about past AI/automation projects and outcomes
- Focus on the HOW - technical feasibility and team readiness
- End with: "Great insights! Let's discuss the business side - timeline and decision process - in our final conversation."

Start by referencing their previous input and diving into technical aspects.`;

const ROUND_3_SYSTEM_PROMPT = `You are conducting Round 3 of AI project qualification: AUTHORITY AND INVESTMENT CONFIRMATION.

Goals:
- Confirm decision-making authority and approval process
- Validate budget range and investment readiness
- Assess vendor selection maturity and timeline
- Establish next steps and realistic expectations

Guidelines:
- Reference insights from previous rounds to show comprehensive understanding
- Ask about budget approval process, timeline, decision makers
- Probe for vendor selection criteria and evaluation process
- Discuss implementation timeline and readiness
- Focus on the WHO and WHEN - authority and timeline validation
- End with clear next steps and expectations

Start by acknowledging their previous responses and focusing on business/authority aspects.`;

// Enhanced scoring prompts for comprehensive assessment
const ENHANCED_AI_READINESS_PROMPT = `Score this multi-round prospect conversation for comprehensive AI readiness assessment.

Full Conversation History:
{full_conversation}

Round Information:
- Rounds Completed: {rounds_completed}
- Round Quality: {round_quality}
- Conversation Progression: {progression_quality}

Enhanced Scoring Rubric (0-100 total):

1. **Project Clarity & Business Case (0-20)**
   - Specific problem identification with measurable impact
   - Clear understanding of current state and desired outcomes
   - Realistic success metrics defined

2. **Technical Infrastructure Readiness (0-20)**
   - Data infrastructure and accessibility
   - Technical team capability and involvement
   - Integration requirements understanding

3. **Timeline & Urgency Validation (0-20)**
   - Business drivers creating timeline pressure
   - Realistic project timeline expectations
   - Executive mandate or competitive pressure

4. **Budget & Investment Reality (0-20)**
   - Budget range alignment with project scope
   - Authority and approval process clarity
   - Investment seriousness indicators

5. **Implementation Readiness (0-20)**
   - Team involvement and change management
   - Vendor selection process maturity
   - Risk awareness and mitigation planning

Enhanced Categories:
- 85-100: HOT - Ready for immediate vendor introduction
- 70-84: WARM - Strong candidate, minor qualification needed
- 55-69: COOL - 3-6 months development needed
- 40-54: NURTURE - 6-12 months education required
- 0-39: COLD - 12+ months away, minimal vendor time

Return detailed JSON with scores, category, evidence, and specific recommendations.`;

class OpenAIService {
  async startConversation(companyName = '') {
    const greeting = companyName 
      ? `Hi ${companyName}! I'm here to understand your AI project needs. What specific business problem are you trying to solve with AI?`
      : `Hi! I'm here to understand your AI project needs. What specific business problem are you trying to solve with AI?`;

    return [
      { role: 'system', content: INTAKE_SYSTEM_PROMPT },
      { role: 'assistant', content: greeting }
    ];
  }

  async generateFollowUp(userResponse, conversationHistory = []) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: FOLLOW_UP_PROMPT.replace('{user_response}', userResponse) },
          ...conversationHistory.slice(-6) // Last 6 messages for context
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI follow-up error:', error);
      throw new Error('Failed to generate follow-up question');
    }
  }

  async continueConversation(messages, userMessage) {
    try {
      const conversationMessages = [
        ...messages,
        { role: 'user', content: userMessage }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: conversationMessages,
        max_tokens: 300,
        temperature: 0.7
      });

      const assistantResponse = response.choices[0].message.content;
      
      return {
        messages: [...conversationMessages, { role: 'assistant', content: assistantResponse }],
        response: assistantResponse
      };
    } catch (error) {
      console.error('OpenAI conversation error:', error);
      throw new Error('Failed to continue conversation');
    }
  }

  async scoreReadiness(conversationMessages) {
    try {
      const conversationText = conversationMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: AI_READINESS_PROMPT.replace('{full_conversation}', conversationText)
          }
        ],
        max_tokens: 1000,
        temperature: 0.3 // Lower temperature for consistent scoring
      });

      // Parse the JSON response
      const scoreData = JSON.parse(response.choices[0].message.content);
      
      return {
        budget_score: scoreData.budget_score || 0,
        use_case_score: scoreData.use_case_score || 0,
        timeline_score: scoreData.timeline_score || 0,
        technical_score: scoreData.technical_score || 0,
        total_score: scoreData.total_score || 0,
        category: scoreData.category || 'COLD',
        evidence: scoreData.evidence || [],
        summary: scoreData.summary || ''
      };
    } catch (error) {
      console.error('OpenAI scoring error:', error);
      // Fallback scoring if AI fails
      return {
        budget_score: 0,
        use_case_score: 0,
        timeline_score: 0,
        technical_score: 0,
        total_score: 0,
        category: 'COLD',
        evidence: ['AI scoring failed'],
        summary: 'Unable to score - manual review required'
      };
    }
  }

  async matchVendors(prospectSummary, vendors) {
    try {
      const vendorListJson = JSON.stringify(vendors.map(v => ({
        id: v.id,
        company_name: v.company_name,
        capabilities: v.capabilities,
        industries: v.industries,
        typical_deal_size: v.typical_deal_size,
        description: v.description
      })));

      const prompt = VENDOR_MATCH_PROMPT
        .replace('{prospect_summary}', prospectSummary.description || '')
        .replace('{industry}', prospectSummary.industry || 'Not specified')
        .replace('{use_case}', prospectSummary.use_case || 'Not specified')
        .replace('{budget}', prospectSummary.budget || 'Not specified')
        .replace('{timeline}', prospectSummary.timeline || 'Not specified')
        .replace('{requirements}', prospectSummary.requirements || 'Not specified')
        .replace('{vendor_list_json}', vendorListJson);

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      });

      // Parse the response to extract match scores
      const matchResults = JSON.parse(response.choices[0].message.content);
      return matchResults;
    } catch (error) {
      console.error('OpenAI vendor matching error:', error);
      // Fallback to simple matching
      return vendors.slice(0, 3).map(vendor => ({
        vendor_id: vendor.id,
        match_score: 50,
        reasons: ['Fallback match - AI matching failed'],
        concerns: ['Requires manual review'],
        talking_points: ['General AI capabilities discussion']
      }));
    }
  }

  async extractProjectDetails(conversationMessages) {
    try {
      const conversationText = conversationMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const extractionPrompt = `Extract key project details from this conversation:

${conversationText}

Return JSON with:
{
  "industry": "extracted industry",
  "use_case": "specific AI use case",
  "budget_range": "budget mentioned or inferred",
  "timeline": "project timeline",
  "technical_requirements": "technical needs mentioned",
  "decision_makers": "who's involved in decision making",
  "pain_points": ["list", "of", "pain", "points"],
  "success_metrics": "how they'll measure success"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: extractionPrompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI extraction error:', error);
      return {};
    }
  }

  // Enhanced Multi-Round Conversation Methods
  async startRoundConversation(roundNumber, previousContext = null, companyName = '') {
    const systemPrompts = {
      1: ROUND_1_SYSTEM_PROMPT,
      2: ROUND_2_SYSTEM_PROMPT,
      3: ROUND_3_SYSTEM_PROMPT
    };

    const systemPrompt = systemPrompts[roundNumber] || ROUND_1_SYSTEM_PROMPT;
    
    try {
      let contextualPrompt = systemPrompt;
      let greeting = '';
      
      if (roundNumber === 1) {
        greeting = companyName 
          ? `Hi ${companyName}! Let's explore your AI project needs. What specific business challenge is driving your interest in AI solutions?`
          : `Hi! Let's explore your AI project needs. What specific business challenge is driving your interest in AI solutions?`;
      } else if (previousContext) {
        // Generate contextual greeting referencing previous rounds
        const contextPrompt = `Based on previous conversation context, generate a personalized greeting for Round ${roundNumber}:

Previous Context: ${JSON.stringify(previousContext)}

Generate a warm, conversational opening that:
1. References specific details from previous rounds
2. Smoothly transitions to this round's focus
3. Makes the prospect feel heard and understood
4. Sets clear expectations for this conversation

Keep it under 100 words and maintain a professional but friendly tone.`;

        const contextResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'system', content: contextPrompt }],
          max_tokens: 200,
          temperature: 0.7
        });

        greeting = contextResponse.choices[0].message.content;
      }

      return [
        { role: 'system', content: contextualPrompt },
        { role: 'assistant', content: greeting }
      ];
    } catch (error) {
      console.error('Error starting round conversation:', error);
      // Fallback to basic round start
      return [
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: `Let's continue with Round ${roundNumber} of our conversation.` }
      ];
    }
  }

  async scoreEnhancedReadiness(conversationData, roundsCompleted = 1, progressionQuality = 'stable') {
    try {
      const fullConversationText = this.formatMultiRoundConversation(conversationData);
      
      const prompt = ENHANCED_AI_READINESS_PROMPT
        .replace('{full_conversation}', fullConversationText)
        .replace('{rounds_completed}', roundsCompleted.toString())
        .replace('{round_quality}', progressionQuality)
        .replace('{progression_quality}', progressionQuality);

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 1200,
        temperature: 0.3
      });

      const scoreData = JSON.parse(response.choices[0].message.content);
      
      // Enhanced scoring with more granular assessment
      return {
        project_clarity_score: scoreData.project_clarity_score || 0,
        technical_readiness_score: scoreData.technical_readiness_score || 0,
        timeline_urgency_score: scoreData.timeline_urgency_score || 0,
        budget_reality_score: scoreData.budget_reality_score || 0,
        implementation_readiness_score: scoreData.implementation_readiness_score || 0,
        total_score: scoreData.total_score || 0,
        category: scoreData.category || 'COLD',
        evidence: scoreData.evidence || {},
        recommendations: scoreData.recommendations || [],
        confidence_level: scoreData.confidence_level || 'low',
        round_progression_quality: progressionQuality,
        rounds_completed: roundsCompleted
      };
    } catch (error) {
      console.error('Enhanced scoring error:', error);
      // Fallback to basic scoring
      return this.scoreReadiness(conversationData.messages || []);
    }
  }

  async analyzeBehavioralPatterns(messageData, responseTime, conversationId) {
    try {
      const behavioralPrompt = `Analyze this message for behavioral authenticity and engagement quality:

Message: "${messageData.content}"
Response Time: ${responseTime} seconds
Context: Business AI project qualification conversation

Analyze for:
1. **Response Timing Appropriateness** (0-100)
   - Too fast for complex questions (red flag)
   - Reasonable thinking time for question complexity
   - Consistent with previous response patterns

2. **Content Authenticity** (0-100)
   - Specific details vs generic responses
   - Personal/company-specific examples
   - Consistent with previous statements

3. **Engagement Quality** (0-100)
   - Thoughtful, detailed responses
   - Questions showing genuine interest
   - Building on previous conversation

4. **Communication Sophistication** (0-100)
   - Business-appropriate language
   - Technical understanding appropriate to role
   - Professional communication style

Return JSON with:
{
  "timing_score": 0-100,
  "authenticity_score": 0-100,
  "engagement_score": 0-100,
  "sophistication_score": 0-100,
  "overall_behavioral_score": 0-100,
  "red_flags": ["any concerning patterns"],
  "positive_signals": ["authentic engagement indicators"],
  "analysis_notes": "brief explanation of assessment"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: behavioralPrompt }],
        max_tokens: 600,
        temperature: 0.3
      });

      const behavioralData = JSON.parse(response.choices[0].message.content);
      
      // Behavioral analysis storage handled via API routes to avoid circular dependencies

      return behavioralData;
    } catch (error) {
      console.error('Behavioral analysis error:', error);
      return {
        timing_score: 50,
        authenticity_score: 50,
        engagement_score: 50,
        sophistication_score: 50,
        overall_behavioral_score: 50,
        red_flags: ['analysis_error'],
        positive_signals: [],
        analysis_notes: 'Unable to analyze - manual review recommended'
      };
    }
  }

  async generateRoundSummary(conversationMessages, roundNumber) {
    try {
      const conversationText = conversationMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const summaryPrompt = `Summarize Round ${roundNumber} of this AI project qualification conversation:

${conversationText}

Generate a comprehensive summary for Round ${roundNumber}:
{
  "round_focus": "What this round focused on",
  "key_insights": ["main insights discovered"],
  "questions_answered": ["questions that got clear answers"],
  "gaps_identified": ["areas needing more information"],
  "readiness_indicators": ["positive signals for AI readiness"],
  "concerns_raised": ["potential red flags or concerns"],
  "next_round_recommendations": ["what to focus on next"],
  "completion_quality": "excellent|good|adequate|poor"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: summaryPrompt }],
        max_tokens: 800,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Round summary error:', error);
      return {
        round_focus: `Round ${roundNumber} conversation`,
        key_insights: [],
        completion_quality: 'adequate'
      };
    }
  }

  // Helper method to format multi-round conversations
  formatMultiRoundConversation(conversationData) {
    if (conversationData.rounds && Array.isArray(conversationData.rounds)) {
      // Multi-round format
      return conversationData.rounds.map((round, index) => {
        const roundMessages = round.messages || [];
        const roundText = roundMessages
          .filter(msg => msg.role !== 'system')
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        return `=== ROUND ${index + 1} ===\n${roundText}`;
      }).join('\n\n');
    } else if (conversationData.messages) {
      // Single conversation format
      return conversationData.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
    }
    return JSON.stringify(conversationData);
  }

  // Method to check if conversation is ready for next round
  async assessRoundCompleteness(conversationMessages, currentRound) {
    try {
      const conversationText = conversationMessages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const completenessPrompt = `Assess if Round ${currentRound} conversation is complete and ready for the next round:

${conversationText}

Round ${currentRound} objectives:
${currentRound === 1 ? '- Identify specific business problem\n- Understand current pain points\n- Assess initial urgency' :
  currentRound === 2 ? '- Assess technical infrastructure\n- Validate team capability\n- Understand integration needs' :
  '- Confirm decision authority\n- Validate budget process\n- Establish timeline reality'}

Return JSON:
{
  "is_complete": boolean,
  "completion_score": 0-100,
  "objectives_met": ["which objectives were achieved"],
  "missing_information": ["what still needs to be covered"],
  "ready_for_next_round": boolean,
  "recommended_follow_up": "what to ask next or if ready to advance"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: completenessPrompt }],
        max_tokens: 600,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Round completeness assessment error:', error);
      return {
        is_complete: false,
        completion_score: 50,
        ready_for_next_round: false,
        recommended_follow_up: 'Continue current round conversation'
      };
    }
  }
}

module.exports = new OpenAIService();