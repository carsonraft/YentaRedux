const OpenAIService = require('./openai');

// The full list of fields the AI needs to collect, nested for clarity.
const REQUIRED_FIELDS = {
  problem: ['type', 'industry'],
  user: ['jobFunction', 'decisionRole'],
  solution: ['preference', 'capacity', 'tech_readiness'],
  timeline: ['urgency', 'budget_status', 'budget_amount']
};

class MultiRoundConversationService {
  constructor() {
    this.openaiService = OpenAIService;
  }

  // Main entry point for processing a user's message.
  async processMessage(message, context = {}) {
    try {
      const history = context.history || [];
      let structuredData = context.structuredData || {};
      let summary = context.summary || '';
      let quotes = context.quotes || [];

      // If this is the first message, return a friendly greeting.
      if (history.length === 0) {
        const greeting = "Hello! To start, how would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?";
        const initialHistory = [{ role: 'assistant', content: greeting }];
        return this.buildResponsePacket(greeting, initialHistory, structuredData, summary, quotes, false, 0, false);
      }

      const newHistory = [...history, { role: 'user', content: message }];

      // Periodically summarize the conversation to keep the context sharp.
      if (newHistory.length > 6 && newHistory.length % 4 === 0) { // Summarize every 4 messages after the initial 6
        const summaryResult = await this.summarizeAndExtractQuotes(newHistory);
        summary = summaryResult.summary;
        quotes = [...new Set([...quotes, ...summaryResult.quotes])]; // Add new unique quotes
      }
      
      const effectiveHistory = summary ? [{role: 'system', content: `Here is a summary of the conversation so far: ${summary}`}, ...newHistory.slice(-4)] : newHistory;

      // On every turn, re-evaluate the entire conversation to update our structured data.
      structuredData = await this.extractAllStructuredData(newHistory);

      const missingFields = this.getMissingFields(structuredData);
      const totalFields = Object.values(REQUIRED_FIELDS).flat().length;
      const completedFields = totalFields - missingFields.length;
      const progress = Math.round((completedFields / totalFields) * 100);
      const shouldOfferSubmit = progress >= 75;

      if (missingFields.length === 0) {
        const closingMessage = "Thank you. That's everything I need for now. We've got a great starting point, and we'll be in touch shortly with next steps!";
        const finalHistory = [...newHistory, { role: 'assistant', content: closingMessage }];
        return this.buildResponsePacket(closingMessage, finalHistory, structuredData, summary, quotes, true, 100, false);
      }

      const aiResponse = await this.generateAiResponse(effectiveHistory, structuredData, missingFields, shouldOfferSubmit);
      const finalHistory = [...newHistory, { role: 'assistant', content: aiResponse }];

      return this.buildResponsePacket(aiResponse, finalHistory, structuredData, summary, quotes, false, progress, shouldOfferSubmit);

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "Sorry, I'm having a bit of trouble thinking right now. Please try again in a moment.",
        context: {},
        isComplete: false,
      };
    }
  }
  
  buildResponsePacket(response, history, structuredData, summary, quotes, isComplete, progress, shouldOfferSubmit) {
    return {
      response,
      context: { history, structuredData, summary, quotes },
      structuredData, // For immediate use by the frontend
      isComplete,
      progress,
      shouldOfferSubmit,
    };
  }

  getMissingFields(data) {
    const missing = [];
    for (const category in REQUIRED_FIELDS) {
      for (const field of REQUIRED_FIELDS[category]) {
        if (!data[category] || !data[category][field]) {
          missing.push(`${category}.${field}`);
        }
      }
    }
    return missing;
  }

  async generateAiResponse(history, collectedData, missingFields, shouldOfferSubmit) {
    const masterPrompt = `
      Your role is a friendly and professional AI consultant. Your goal is to qualify a potential customer by gathering specific information, which is organized into categories.

      Here is the conversation history (or a summary followed by recent messages):
      ${JSON.stringify(history, null, 2)}

      Here is the information you have successfully collected, organized by category:
      ${JSON.stringify(collectedData, null, 2)}

      Here are the specific fields of information you STILL NEED to collect:
      - ${missingFields.join('\n- ')}

      Based on all of the above, your task is to ask the *next, single, most natural question* to continue the conversation and gather one more piece of the missing information.
      
      **Formatting Rules:**
      - Use line breaks (
) to separate thoughts and questions for readability.
      - When asking a question to gather a missing piece of information, you should suggest 2-4 relevant, multiple-choice style options if it feels natural. For example, if asking about urgency, you could phrase it as "Is this an urgent priority, or are you still in the exploratory phase?"

      **Special Instruction:**
      - ${shouldOfferSubmit ? "You have collected enough information to proceed. Please give the user the option to submit their information now or continue to answer the remaining questions. Frame this as a helpful offer." : "Continue the conversation naturally."}

      **Example of a good response:**
      "Thanks for sharing that. It sounds like a challenging situation.

To help me understand the context better, could you tell me about your role? For instance, are you the final decision-maker, part of a team evaluating solutions, or primarily conducting research?"

      Now, formulate your response.
    `;

    const response = await this.openaiService.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: masterPrompt }],
      max_tokens: 150,
      temperature: 0.8,
    });

    return response.choices[0].message.content;
  }

  async summarizeAndExtractQuotes(history) {
    const prompt = `
      Please provide a concise summary of the following business conversation. Also, extract up to two direct quotes from the 'user' that you believe are most important for understanding their core needs.

      Conversation History:
      ${JSON.stringify(history, null, 2)}

      Format your response as a JSON object with two keys: "summary" and "quotes". The "quotes" value should be an array of strings.
    `;
    const response = await this.openaiService.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'system', content: 'You are an expert at summarizing business conversations and identifying key statements.' }, { role: 'user', content: prompt }],
        response_format: { type: "json_object" },
    });

    try {
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        console.error("Failed to parse summary and quotes from AI response:", e);
        return { summary: "Could not generate a summary at this time.", quotes: [] };
    }
  }

  async extractAllStructuredData(history) {
    const fullConversationText = history.map(h => h.content).join('\n').toLowerCase();
    const data = { problem: {}, user: {}, solution: {}, timeline: {} };

    // Problem
    if (fullConversationText.includes('customer') || fullConversationText.includes('support') || fullConversationText.includes('sales')) data.problem.type = 'customer_support';
    if (fullConversationText.includes('finance') || fullConversationText.includes('accounting')) data.problem.type = 'financial_management';
    if (fullConversationText.includes('operations') || fullConversationText.includes('hr') || fullConversationText.includes('hiring')) data.problem.type = 'operations';
    if (fullConversationText.includes('tech') || fullConversationText.includes('software')) data.problem.industry = 'technology';
    if (fullConversationText.includes('health')) data.problem.industry = 'healthcare';

    // User
    if (fullConversationText.includes('ceo') || fullConversationText.includes('founder') || fullConversationText.includes('cto')) data.user.jobFunction = 'c_level';
    if (fullConversationText.includes('manager') || fullConversationText.includes('director')) data.user.jobFunction = 'management';
    if (fullConversationText.includes('i decide') || fullConversationText.includes('final say')) data.user.decisionRole = 'decision_maker';
    if (fullConversationText.includes('my team') || fullConversationText.includes('we decide')) data.user.decisionRole = 'team_member';
    if (fullConversationText.includes('i am researching') || fullConversationText.includes('evaluating')) data.user.decisionRole = 'researcher';

    // Solution
    if (fullConversationText.includes('off-the-shelf') || fullConversationText.includes('plug in')) data.solution.preference = 'off_the_shelf';
    if (fullConversationText.includes('custom') || fullConversationText.includes('build')) data.solution.preference = 'custom';
    if (fullConversationText.includes('internal') || fullConversationText.includes('our team')) data.solution.capacity = 'internal';
    if (fullConversationText.includes('external') || fullConversationText.includes('agency') || fullConversationText.includes('consultant')) data.solution.capacity = 'external';
    if (fullConversationText.includes('python') || fullConversationText.includes('api') || fullConversationText.includes('engineer')) data.solution.tech_readiness = 'advanced';
    if (fullConversationText.includes('excel') || fullConversationText.includes('spreadsheets') || fullConversationText.includes('no code')) data.solution.tech_readiness = 'basic';

    // Timeline
    if (fullConversationText.includes('urgent') || fullConversationText.includes('asap') || fullConversationText.includes('pressure')) data.timeline.urgency = 'high';
    if (fullConversationText.includes('exploring') || fullConversationText.includes('researching')) data.timeline.urgency = 'low';
    if (fullConversationText.includes('have budget') || fullConversationText.includes('budget allocated')) data.timeline.budget_status = 'approved';
    if (fullConversationText.includes('figuring out') || fullConversationText.includes('no budget')) data.timeline.budget_status = 'in_planning';
    
    const budgetPatterns = [/\$(\d{1,3}(,\d{3})*(\.\d+)?k?)/, /(\d+k)/];
    for (const pattern of budgetPatterns) {
      const match = fullConversationText.match(pattern);
      if (match) {
        data.timeline.budget_amount = match[0];
        break;
      }
    }

    return data;
  }
}

module.exports = MultiRoundConversationService;