const db = require('../db/pool');
const OpenAIService = require('./openai');

class MultiRoundConversationService {
  constructor() {
    this.openaiService = OpenAIService;
  }

  async processMessage(message, context = {}) {
    try {
      // Construct the conversation history for the AI
      const messages = context.history || [];
      if (messages.length === 0) {
        messages.push({ role: 'system', content: this.openaiService.INTAKE_SYSTEM_PROMPT });
      }
      messages.push({ role: 'user', content: message });

      // FORCE HARDCODED GREETING - FUCK IT
      if (true) {
        const hardcodedGreeting = context.companyName 
          ? `Hello ${context.companyName}! Let's find you the support you need. </br> How would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?`
          : `Hello! Let's find you the support you need. </br> How would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?`;
        
        messages.push({ role: 'assistant', content: hardcodedGreeting });
        
        return {
          response: hardcodedGreeting,
          context: {
            ...context,
            history: messages,
            lastQuestion: 'challengeDescription'
          },
          structured: {},
          isComplete: false
        };
      }

      // Get the AI's response
      const { response: aiResponse, messages: newHistory } = await this.openaiService.continueConversation(messages, message);

      // Extract structured data from the conversation
      const extractedData = await this.extractStructuredData(message, context);
      
      // Merge extracted data with existing context
      const newContext = {
        ...context,
        history: newHistory,
        lastQuestion: this.detectLastQuestion(aiResponse),
        // Update context fields with extracted data
        ...(extractedData.context || {}),
      };

      // Return structured data separately for the frontend
      return {
        response: aiResponse,
        context: newContext,
        structured: extractedData.structured || {},
        isComplete: false,
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "Sorry, I'm having a bit of trouble thinking right now. Please try again in a moment.",
        context,
        isComplete: false,
      };
    }
  }

  async generateConversationSummary(conversationHistory, collectedData) {
    try {
      const summaryPrompt = `
        Based on this conversation history and collected data, generate a comprehensive summary for passing to the next round of conversation.

        Conversation History:
        ${JSON.stringify(conversationHistory, null, 2)}

        Collected Structured Data:
        ${JSON.stringify(collectedData.structured, null, 2)}

        Collected Context Data:
        ${JSON.stringify(collectedData.context, null, 2)}

        Please create a summary that includes:
        1. Key insights about their business problem
        2. Decision-making authority and team dynamics
        3. Technical readiness and current capabilities
        4. Budget and timeline constraints
        5. Most important quotes and pain points

        Format this as a comprehensive briefing for the next conversation round.
      `;

      const response = await this.openaiService.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert at summarizing business conversations for handoff between conversation rounds.' },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating conversation summary:', error);
      return 'Previous conversation covered project discovery and initial requirements gathering.';
    }
  }

  detectLastQuestion(aiResponse) {
    // Detect what the AI is asking about based on keywords
    const response = aiResponse.toLowerCase();
    if (response.includes('challenge') || response.includes('problem') || response.includes('solve')) {
      return 'challengeDescription';
    } else if (response.includes('industry')) {
      return 'industryContext';
    } else if (response.includes('role') || response.includes('decision')) {
      return 'authorityContext';
    } else if (response.includes('urgency') || response.includes('timeline') || response.includes('when')) {
      return 'urgencyReasoning';
    } else if (response.includes('budget') || response.includes('investment')) {
      return 'budgetContext';
    } else if (response.includes('solution') || response.includes('preference')) {
      return 'solutionPreferences';
    } else if (response.includes('implementation') || response.includes('concern')) {
      return 'implementationConcerns';
    }
    return null;
  }

  async extractStructuredData(message, context) {
    // Extract structured data from user message
    const lowerMessage = message.toLowerCase();
    const structured = {};
    const contextData = {};

    // Extract problem type (comprehensive patterns)
    if (lowerMessage.includes('hiring') || lowerMessage.includes('recruitment') || lowerMessage.includes('recruit') || 
        lowerMessage.includes('hr') || lowerMessage.includes('talent') || lowerMessage.includes('candidate')) {
      structured.problemType = 'hiring_recruitment';
      structured.problemTypeCategory = 'hiring_recruitment';
    } else if (lowerMessage.includes('customer') || lowerMessage.includes('support') || lowerMessage.includes('service') || 
               lowerMessage.includes('helpdesk') || lowerMessage.includes('ticket')) {
      structured.problemType = 'customer_support';
      structured.problemTypeCategory = 'customer_support';
    } else if (lowerMessage.includes('data') || lowerMessage.includes('analytics') || lowerMessage.includes('report') || 
               lowerMessage.includes('dashboard') || lowerMessage.includes('insight')) {
      structured.problemType = 'data_analysis';
      structured.problemTypeCategory = 'data_analysis';
    } else if (lowerMessage.includes('financial') || lowerMessage.includes('finance') || lowerMessage.includes('accounting') || 
               lowerMessage.includes('invoice') || lowerMessage.includes('expense')) {
      structured.problemType = 'financial_management';
      structured.problemTypeCategory = 'financial_management';
    } else if (lowerMessage.includes('sales') || lowerMessage.includes('marketing') || lowerMessage.includes('lead') || 
               lowerMessage.includes('campaign') || lowerMessage.includes('crm')) {
      structured.problemType = 'sales_marketing';
      structured.problemTypeCategory = 'sales_marketing';
    } else if (lowerMessage.includes('time track') || lowerMessage.includes('productivity') || lowerMessage.includes('timesheet')) {
      structured.problemType = 'time_tracking';
      structured.problemTypeCategory = 'time_tracking';
    } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('warehouse')) {
      structured.problemType = 'inventory_management';
      structured.problemTypeCategory = 'inventory_management';
    } else if (lowerMessage.includes('content') || lowerMessage.includes('writing') || lowerMessage.includes('blog') || 
               lowerMessage.includes('social media')) {
      structured.problemType = 'content_creation';
      structured.problemTypeCategory = 'content_creation';
    } else if (lowerMessage.includes('document') || lowerMessage.includes('pdf') || lowerMessage.includes('contract') || 
               lowerMessage.includes('processing')) {
      structured.problemType = 'document_processing';
      structured.problemTypeCategory = 'document_processing';
    } else if (lowerMessage.includes('quality') || lowerMessage.includes('testing') || lowerMessage.includes('qa')) {
      structured.problemType = 'quality_assurance';
      structured.problemTypeCategory = 'quality_assurance';
    } else if (lowerMessage.includes('predict') || lowerMessage.includes('forecast') || lowerMessage.includes('trend')) {
      structured.problemType = 'predictive_analytics';
      structured.problemTypeCategory = 'predictive_analytics';
    } else if (lowerMessage.includes('automat') || lowerMessage.includes('process') || lowerMessage.includes('workflow')) {
      structured.problemType = 'process_automation';
      structured.problemTypeCategory = 'process_automation';
    } else if (lowerMessage.includes('compliance') || lowerMessage.includes('regulation') || lowerMessage.includes('audit')) {
      structured.problemType = 'compliance_reporting';
      structured.problemTypeCategory = 'compliance_reporting';
    } else if (lowerMessage.includes('fraud') || lowerMessage.includes('risk') || lowerMessage.includes('security')) {
      structured.problemType = 'fraud_detection';
      structured.problemTypeCategory = 'fraud_detection';
    } else if (lowerMessage.includes('personaliz') || lowerMessage.includes('recommend') || lowerMessage.includes('custom')) {
      structured.problemType = 'personalization';
      structured.problemTypeCategory = 'personalization';
    }

    // Extract industry (comprehensive patterns)
    if (lowerMessage.includes('tech') || lowerMessage.includes('technology') || lowerMessage.includes('software') || 
        lowerMessage.includes('saas') || lowerMessage.includes('startup')) {
      structured.industry = 'technology';
      structured.industryCategory = 'technology';
    } else if (lowerMessage.includes('healthcare') || lowerMessage.includes('health') || lowerMessage.includes('medical') || 
               lowerMessage.includes('hospital') || lowerMessage.includes('clinic')) {
      structured.industry = 'healthcare';
      structured.industryCategory = 'healthcare';
    } else if (lowerMessage.includes('finance') || lowerMessage.includes('bank') || lowerMessage.includes('fintech') || 
               lowerMessage.includes('investment') || lowerMessage.includes('credit')) {
      structured.industry = 'finance';
      structured.industryCategory = 'finance';
    } else if (lowerMessage.includes('retail') || lowerMessage.includes('ecommerce') || lowerMessage.includes('shop') || 
               lowerMessage.includes('store') || lowerMessage.includes('merchant')) {
      structured.industry = 'retail';
      structured.industryCategory = 'retail';
    } else if (lowerMessage.includes('construction') || lowerMessage.includes('building') || lowerMessage.includes('contractor')) {
      structured.industry = 'construction';
      structured.industryCategory = 'construction';
    } else if (lowerMessage.includes('manufacturing') || lowerMessage.includes('factory') || lowerMessage.includes('production')) {
      structured.industry = 'manufacturing';
      structured.industryCategory = 'manufacturing';
    } else if (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('university') || 
               lowerMessage.includes('training')) {
      structured.industry = 'education';
      structured.industryCategory = 'education';
    } else if (lowerMessage.includes('government') || lowerMessage.includes('public sector') || lowerMessage.includes('municipal')) {
      structured.industry = 'government';
      structured.industryCategory = 'government';
    } else if (lowerMessage.includes('real estate') || lowerMessage.includes('property') || lowerMessage.includes('realtor')) {
      structured.industry = 'real_estate';
      structured.industryCategory = 'real_estate';
    } else if (lowerMessage.includes('insurance') || lowerMessage.includes('claims') || lowerMessage.includes('policy')) {
      structured.industry = 'insurance';
      structured.industryCategory = 'insurance';
    } else if (lowerMessage.includes('consulting') || lowerMessage.includes('advisory') || lowerMessage.includes('consultant')) {
      structured.industry = 'consulting';
      structured.industryCategory = 'consulting';
    } else if (lowerMessage.includes('media') || lowerMessage.includes('entertainment') || lowerMessage.includes('content') || 
               lowerMessage.includes('publishing')) {
      structured.industry = 'media_entertainment';
      structured.industryCategory = 'media_entertainment';
    } else if (lowerMessage.includes('transportation') || lowerMessage.includes('logistics') || lowerMessage.includes('shipping')) {
      structured.industry = 'transportation';
      structured.industryCategory = 'transportation';
    } else if (lowerMessage.includes('energy') || lowerMessage.includes('oil') || lowerMessage.includes('renewable')) {
      structured.industry = 'energy';
      structured.industryCategory = 'energy';
    } else if (lowerMessage.includes('agriculture') || lowerMessage.includes('farming') || lowerMessage.includes('food')) {
      structured.industry = 'agriculture';
      structured.industryCategory = 'agriculture';
    } else if (lowerMessage.includes('legal') || lowerMessage.includes('law') || lowerMessage.includes('attorney')) {
      structured.industry = 'legal';
      structured.industryCategory = 'legal';
    } else if (lowerMessage.includes('nonprofit') || lowerMessage.includes('charity') || lowerMessage.includes('foundation')) {
      structured.industry = 'nonprofit';
      structured.industryCategory = 'nonprofit';
    }

    // Extract decision role (enhanced patterns)
    if (lowerMessage.includes('final decision') || lowerMessage.includes('make decision') || lowerMessage.includes('decide')) {
      structured.decisionRole = 'decision_maker';
      structured.decisionRoleCategory = 'chief_decision_maker';
    } else if (lowerMessage.includes('research') || lowerMessage.includes('evaluate') || lowerMessage.includes('looking into')) {
      structured.decisionRole = 'researcher';
      structured.decisionRoleCategory = 'researcher';
    } else if (lowerMessage.includes('team member') || lowerMessage.includes('part of team')) {
      structured.decisionRole = 'team_member';
      structured.decisionRoleCategory = 'team_member';
    }

    // Extract job function (comprehensive patterns)
    if (lowerMessage.includes('ceo') || lowerMessage.includes('chief executive') || lowerMessage.includes('president')) {
      structured.jobFunction = 'CEO/President';
      structured.jobFunctionCategory = 'c_level';
    } else if (lowerMessage.includes('founder') || lowerMessage.includes('co-founder') || lowerMessage.includes('owner')) {
      structured.jobFunction = 'Founder/Owner';
      structured.jobFunctionCategory = 'founder';
    } else if (lowerMessage.includes('cto') || lowerMessage.includes('cfo') || lowerMessage.includes('coo') || 
               lowerMessage.includes('chief')) {
      structured.jobFunction = 'C-Level Executive';
      structured.jobFunctionCategory = 'c_level';
    } else if (lowerMessage.includes('vp') || lowerMessage.includes('vice president') || lowerMessage.includes('vice-president')) {
      structured.jobFunction = 'Vice President';
      structured.jobFunctionCategory = 'vp';
    } else if (lowerMessage.includes('director') || lowerMessage.includes('head of') || lowerMessage.includes('senior director')) {
      structured.jobFunction = 'Director';
      structured.jobFunctionCategory = 'director';
    } else if (lowerMessage.includes('manager') || lowerMessage.includes('lead') || lowerMessage.includes('supervisor')) {
      structured.jobFunction = 'Manager';
      structured.jobFunctionCategory = 'manager';
    } else if (lowerMessage.includes('consultant') || lowerMessage.includes('freelance') || lowerMessage.includes('contractor')) {
      structured.jobFunction = 'Consultant';
      structured.jobFunctionCategory = 'consultant';
    } else if (lowerMessage.includes('engineer') || lowerMessage.includes('developer') || lowerMessage.includes('analyst') || 
               lowerMessage.includes('specialist')) {
      structured.jobFunction = 'Individual Contributor';
      structured.jobFunctionCategory = 'individual_contributor';
    }

    // Extract team size (enhanced patterns)
    const teamSizePatterns = [
      /(\d+)\s*people/,
      /(\d+)\s*employees/,
      /(\d+)\s*person/,
      /(\d+)\s*member/,
      /(\d+)\s*team/,
      /team\s*of\s*(\d+)/,
      /about\s*(\d+)/,
      /around\s*(\d+)/
    ];
    
    for (const pattern of teamSizePatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        structured.teamSize = `${match[1]} people`;
        structured.teamSizeNumber = match[1];
        break;
      }
    }

    // Extract tech capability (enhanced patterns)
    if (lowerMessage.includes('python') || lowerMessage.includes('aws') || lowerMessage.includes('cloud') || 
        lowerMessage.includes('api') || lowerMessage.includes('database')) {
      structured.techCapability = 'advanced';
      structured.techCapabilityCategory = 'advanced';
    } else if (lowerMessage.includes('excel') || lowerMessage.includes('spreadsheet') || lowerMessage.includes('basic')) {
      structured.techCapability = 'basic';
      structured.techCapabilityCategory = 'basic';
    } else if (lowerMessage.includes('some experience') || lowerMessage.includes('learning')) {
      structured.techCapability = 'intermediate';
      structured.techCapabilityCategory = 'intermediate';
    }

    // Extract urgency (enhanced patterns)
    const urgencyPatterns = [
      /(\d+[-\s]?\d*\s*months?)/,
      /(\d+\s*weeks?)/,
      /asap|urgent|immediately/,
      /q[1-4]|quarter/,
      /next\s*year/
    ];
    
    for (const pattern of urgencyPatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        if (match[0].includes('week') || match[0].includes('asap') || match[0].includes('urgent')) {
          structured.businessUrgency = match[0];
          structured.businessUrgencyCategory = 'under_3_months';
        } else if (match[0].includes('3-6') || (match[1] && parseInt(match[1]) <= 6)) {
          structured.businessUrgency = match[0];
          structured.businessUrgencyCategory = '3_to_6_months';
        } else {
          structured.businessUrgency = match[0];
          structured.businessUrgencyCategory = '1_year_plus';
        }
        break;
      }
    }

    // Extract budget (enhanced patterns)
    const budgetPatterns = [
      /(\$?\d+[,.]?\d*k)/,
      /(\$\d+,?\d*)/,
      /(\d+\s*thousand)/,
      /(\d+\s*million)/
    ];
    
    for (const pattern of budgetPatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        structured.budgetAmount = match[0];
        if (lowerMessage.includes('approved') || lowerMessage.includes('have')) {
          structured.budgetStatus = 'approved';
          structured.budgetStatusCategory = 'approved';
        } else if (lowerMessage.includes('planning') || lowerMessage.includes('considering')) {
          structured.budgetStatus = 'in_planning';
          structured.budgetStatusCategory = 'in_planning';
        } else {
          structured.budgetStatus = 'exploring';
          structured.budgetStatusCategory = 'just_exploring';
        }
        break;
      }
    }

    // Extract context data for better understanding
    if (lowerMessage.length > 20) {
      if (structured.problemType) contextData.challengeDescription = message;
      if (structured.industry) contextData.industryContext = message;
      if (structured.decisionRole) contextData.authorityContext = message;
      if (structured.businessUrgency) contextData.urgencyReasoning = message;
      if (structured.budgetAmount) contextData.budgetContext = message;
    }

    return { structured, context: contextData };
  }
}

module.exports = MultiRoundConversationService;
