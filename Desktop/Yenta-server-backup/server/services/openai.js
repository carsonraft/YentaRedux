const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.SYSTEM_PROMPT = `You are an AI assistant designed to qualify business prospects for AI implementation projects. Your goal is to guide them through 4 key questions to understand their needs and readiness.

CONVERSATION FLOW - Ask questions in this order:

1. UNDERSTANDING THE PROBLEM (Problem Type + Context)
   - Start with: "Could you tell me about the specific business challenge or opportunity you're hoping AI can help with?"
   - Follow up to understand: problemType, jobFunction, industry
   - Example follow-up: "And how would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?"

2. EXPLORING SOLUTION PREFERENCE (Build vs Buy)  
   - Ask: "Are you looking for an off-the-shelf solution you can plug in quickly, or are you open to building something more custom with internal or external help?"
   - Follow up to understand: solutionType, implementationCapacity, techCapability

3. GAUGING BUSINESS URGENCY AND BUY-IN
   - Ask: "How urgent is solving this for you right now? Are you just exploring, or is there active pressure to implement something soon?"
   - Follow up to understand: businessUrgency, decisionRole

4. BUDGET CLARITY
   - Ask: "Do you already have a budget allocated for this AI project, or are you still figuring that out?"
   - Follow up to understand: budgetStatus, budgetAmount

CONVERSATION GUIDELINES:
- Be conversational and natural, not robotic
- Ask ONE focused question at a time
- Build on their previous answers
- Use follow-up questions to get specific details
- If they give vague answers, probe gently for specifics
- Keep responses concise and engaging
- Guide them through all 4 areas before ending
- When you have clear answers for all 4 areas (problem type, solution preference, urgency, and budget), offer a natural conclusion like "Great! I have all the information I need to help match you with the right AI vendors."

CRITICAL: Your FIRST message must start with "Hello! I want to find you an AI vendor" and ask about their business challenge.`;
  }

  async startConversation(companyName = '') {
    const greeting = `Hello! I want to find you an AI vendor that will help with what you need. How would you describe the task or process you want to implement an AI solution for? For example, is it related to customer support, sales, finance, operations, or something else?`;

    return {
      messages: [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'assistant', content: greeting }
      ],
      response: greeting
    };
  }

  async getChatCompletion(messages) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      });

      let assistantResponse = response.choices[0].message.content;
      
      // Strip common AI preambles from responses
      assistantResponse = assistantResponse.replace(/^(Of course!?|Certainly!?|Sure!?|Absolutely!?|I'd be happy to help!?|To kick things off,?)\s*/i, '');
      
      return assistantResponse;
    } catch (error) {
      console.error('OpenAI chat completion error:', error);
      throw new Error('Failed to get chat completion');
    }
  }

  async checkConversationCompleteness(messages) {
    try {
      // Extract current data to check what fields are filled
      const extractedData = await this.extractInfo(messages);
      const structured = extractedData.structured || {};
      
      // Define required fields for completion
      const requiredFields = [
        { field: 'problemType', value: structured.problemType, category: structured.problemTypeCategory },
        { field: 'industry', value: structured.industry, category: structured.industryCategory },
        { field: 'solutionType', value: structured.solutionType, category: structured.solutionTypeCategory },
        { field: 'businessUrgency', value: structured.businessUrgency, category: structured.businessUrgencyCategory },
        { field: 'decisionRole', value: structured.decisionRole, category: structured.decisionRoleCategory },
        { field: 'budgetStatus', value: structured.budgetStatus, category: structured.budgetStatusCategory }
      ];
      
      // Check if all required fields are filled with CLEAR data
      const missingFields = [];
      const unclearFields = [];
      
      requiredFields.forEach(({ field, value, category }) => {
        if (!value || value === 'unknown') {
          missingFields.push(field);
        } else if (category === 'VAGUE' || category === 'UNKNOWN') {
          unclearFields.push(field);
        }
      });
      
      const isComplete = missingFields.length === 0 && unclearFields.length === 0;
      
      return {
        isComplete,
        missingFields,
        unclearFields,
        extractedData,
        completenessScore: ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
      };
      
    } catch (error) {
      console.error('Error checking conversation completeness:', error);
      return {
        isComplete: false,
        missingFields: [],
        unclearFields: [],
        extractedData: null,
        completenessScore: 0
      };
    }
  }

  async extractInfo(conversationHistory) {
    const extractionPrompt = `
      Given the following conversation history:
      ${JSON.stringify(conversationHistory, null, 2)}

      Extract the following information into a JSON object. Only include fields where you are confident based on the conversation.

      {
        "structured": {
          "problemType": "hiring_recruitment|customer_support|data_analysis|financial_management|sales_marketing|time_tracking|inventory_management|content_creation|document_processing|quality_assurance|predictive_analytics|process_automation|compliance_reporting|fraud_detection|personalization|other",
          "problemTypeCategory": "CLEAR|VAGUE|UNKNOWN",
          "industry": "healthcare|finance|construction|retail|manufacturing|technology|education|government|real_estate|insurance|consulting|media_entertainment|transportation|energy|agriculture|legal|nonprofit|other",
          "industryCategory": "CLEAR|VAGUE|UNKNOWN",
          "jobFunction": "individual_contributor|manager|director|vp|c_level|founder|consultant",
          "jobFunctionCategory": "CLEAR|VAGUE|UNKNOWN",
          "solutionType": "off_the_shelf|custom_build|hybrid_approach|undecided",
          "solutionTypeCategory": "CLEAR|VAGUE|UNKNOWN",
          "implementationCapacity": "have_internal_team|need_external_help|hybrid_approach|unknown",
          "implementationCapacityCategory": "CLEAR|VAGUE|UNKNOWN",
          "techCapability": "basic|intermediate|advanced|unknown",
          "techCapabilityCategory": "CLEAR|VAGUE|UNKNOWN",
          "businessUrgency": "urgent_asap|under_3_months|3_to_6_months|6_to_12_months|1_year_plus|just_exploring",
          "businessUrgencyCategory": "CLEAR|VAGUE|UNKNOWN",
          "decisionRole": "researcher|influencer|team_member|decision_maker|budget_holder",
          "decisionRoleCategory": "CLEAR|VAGUE|UNKNOWN",
          "budgetStatus": "approved|in_planning|researching_costs|just_exploring|unknown",
          "budgetStatusCategory": "CLEAR|VAGUE|UNKNOWN",
          "budgetAmount": "amount as string or null"
        },
        "context": {
          "challengeDescription": "Brief description of their specific challenge in their own words",
          "companyContext": "Company size, industry context, or other relevant details",
          "urgencyReasoning": "Why they need to solve this by their timeline",
          "budgetContext": "Budget situation and constraints in their words",
          "decisionContext": "Who else is involved in decision making",
          "technicalContext": "Current tools and technical capabilities mentioned"
        },
        "artifacts": {
          "keyQuotes": ["exact quotes that capture pain points or needs"],
          "currentTools": ["tools they currently use"],
          "painPoints": ["specific problems they face"]
        }
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert at extracting structured information from conversations.' },
          { role: 'user', content: extractionPrompt }
        ],
        response_format: { type: "json_object" },
      });

      const extractedData = JSON.parse(response.choices[0].message.content);
      return extractedData;
    } catch (error) {
      console.error('OpenAI extraction error:', error);
      throw new Error('Failed to extract information');
    }
  }
}

module.exports = new OpenAIService();