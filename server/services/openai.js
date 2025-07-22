const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
}

module.exports = new OpenAIService();