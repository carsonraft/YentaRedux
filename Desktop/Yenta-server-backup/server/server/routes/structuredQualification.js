const openaiService = require('./openai');
const db = require('../db/pool');

/**
 * Structured 4-Step Qualification with Intelligent Follow-ups
 * Combines structured questions with AI-driven gap filling
 */
class StructuredQualificationService {
  constructor() {
    this.openai = openaiService;
    
    // Define the 4 core questions and what data they should extract
    this.coreQuestions = [
      {
        step: 1,
        title: "Understanding the Problem",
        question: "Got it. And how would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?",
        targetFields: [
          'problemType', 'problemTypeCategory', 
          'jobFunction', 'jobFunctionCategory', 
          'industry', 'industryCategory'
        ],
        requiredFields: ['problemType', 'jobFunction'] // Must have these to proceed
      },
      {
        step: 2,
        title: "Exploring Solution Preference",
        question: "Are you looking for an off-the-shelf solution you can plug in quickly, or are you open to building something more custom with internal or external help?",
        targetFields: [
          'solutionType', 'solutionTypeCategory',
          'implementationCapacity', 'implementationCapacityCategory',
          'techCapability', 'techCapabilityCategory'
        ],
        requiredFields: ['solutionType', 'implementationCapacity']
      },
      {
        step: 3,
        title: "Gauging Business Urgency",
        question: "How urgent is solving this for you right now? Are you just exploring, or is there active pressure to implement something soon?",
        targetFields: [
          'businessUrgency', 'businessUrgencyCategory',
          'decisionRole', 'decisionRoleCategory'
        ],
        requiredFields: ['businessUrgency', 'decisionRole']
      },
      {
        step: 4,
        title: "Budget Clarity",
        question: "Do you already have a budget allocated for this AI project, or are you still figuring that out?",
        targetFields: [
          'budgetStatus', 'budgetStatusCategory',
          'budgetAmount'
        ],
        requiredFields: ['budgetStatus']
      }
    ];
  }

  /**
   * Start a new structured qualification session
   */
  async startQualification(prospectId, companyName = '') {
    try {
      // Create conversation record
      const conversationResult = await db.query(
        `INSERT INTO prospect_conversations (prospect_id, conversation_type, status, messages)
         VALUES ($1, 'STRUCTURED_QUALIFICATION', 'active', '[]')
         RETURNING *`,
        [prospectId]
      );
      
      const conversationId = conversationResult.rows[0].id;
      
      // Initialize qualification responses record
      await db.query(
        `INSERT INTO qualification_responses (conversation_id, current_step, extracted_data)
         VALUES ($1, 1, '{}')`,
        [conversationId]
      );
      
      // Get first question
      const firstQuestion = this.coreQuestions[0];
      const greeting = companyName 
        ? `Hi ${companyName}! I'd like to understand your AI project needs through a few focused questions. ${firstQuestion.question}`
        : `Hi! I'd like to understand your AI project needs through a few focused questions. ${firstQuestion.question}`;
      
      return {
        conversationId,
        currentStep: 1,
        totalSteps: 4,
        question: greeting,
        stepTitle: firstQuestion.title
      };
      
    } catch (error) {
      console.error('Error starting qualification:', error);
      throw error;
    }
  }

  /**
   * Process user response and determine next question
   */
  async processResponse(conversationId, userResponse) {
    try {
      // Get current qualification state
      const qualState = await this.getQualificationState(conversationId);
      if (!qualState) {
        throw new Error('Qualification session not found');
      }

      const currentQuestion = this.coreQuestions[qualState.current_step - 1];
      
      // Extract data from user response
      const extractedData = await this.extractDataFromResponse(
        userResponse, 
        currentQuestion.targetFields,
        qualState.extracted_data
      );
      
      // Update qualification record with new data (only merge non-null values to preserve existing data)
      const updatedData = { ...qualState.extracted_data };
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          updatedData[key] = value;
        }
      });
      await this.updateQualificationData(conversationId, updatedData);
      
      // Check if we have ALL required fields for current section
      const missingRequired = this.getMissingRequiredFields(
        currentQuestion.requiredFields, 
        updatedData
      );
      
      if (missingRequired.length > 0) {
        // STAY in current section until all required fields are captured
        const followUpQuestion = await this.generateFollowUpQuestion(
          missingRequired, 
          userResponse,
          currentQuestion
        );
        
        console.log(`🔄 Section ${qualState.current_step} incomplete - missing: ${missingRequired.join(', ')}`);
        
        return {
          conversationId,
          currentStep: qualState.current_step,
          totalSteps: 4,
          question: followUpQuestion,
          stepTitle: `${currentQuestion.title} (gathering details...)`,
          isFollowUp: true,
          sectionComplete: false,
          missingRequired,
          progress: this.calculateSectionProgress(qualState.current_step, updatedData, currentQuestion)
        };
      }
      
      // All required fields captured! Check for high-value optional fields
      const missingOptional = this.getMissingOptionalFields(
        currentQuestion.targetFields,
        currentQuestion.requiredFields,
        updatedData
      );
      
      // Ask for 1-2 most important optional fields, but don't block progression
      if (missingOptional.length > 0 && !qualState.optional_asked) {
        const highValueOptional = this.getHighValueOptionalFields(missingOptional, qualState.current_step);
        
        if (highValueOptional.length > 0) {
          const optionalQuestion = await this.generateFollowUpQuestion(
            highValueOptional,
            userResponse,
            currentQuestion,
            true // isOptional
          );
          
          // Mark that we asked for optional data in this section
          await this.markOptionalAsked(conversationId);
          
          return {
            conversationId,
            currentStep: qualState.current_step,
            totalSteps: 4,
            question: `${optionalQuestion} (This helps me match you better, but feel free to skip if you're not sure.)`,
            stepTitle: `${currentQuestion.title} (optional details)`,
            isFollowUp: true,
            isOptional: true,
            sectionComplete: true, // Required is done, this is bonus
            progress: this.calculateSectionProgress(qualState.current_step, updatedData, currentQuestion)
          };
        }
      }
      
      // Move to next step or complete
      const nextStep = qualState.current_step + 1;
      
      if (nextStep > 4) {
        // Qualification complete
        await this.completeQualification(conversationId, updatedData);
        return {
          conversationId,
          currentStep: 4,
          totalSteps: 4,
          isComplete: true,
          question: "Perfect! I have everything I need. Let me connect you with the right AI vendors who specialize in your type of project.",
          finalData: updatedData,
          progress: 100
        };
      }
      
      // Move to next core question and reset optional tracking
      await this.updateCurrentStep(conversationId, nextStep);
      await this.resetOptionalAsked(conversationId);
      const nextQuestion = this.coreQuestions[nextStep - 1];
      
      console.log(`✅ Section ${qualState.current_step} completed! Moving to Section ${nextStep}`);
      
      return {
        conversationId,
        currentStep: nextStep,
        totalSteps: 4,
        question: nextQuestion.question,
        stepTitle: nextQuestion.title,
        isFollowUp: false,
        progress: this.calculateProgress(nextStep, false)
      };
      
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  /**
   * Extract structured data from user response using AI
   */
  async extractDataFromResponse(userResponse, targetFields, existingData = {}) {
    const extractionPrompt = `You are a strict data extraction tool. Extract ONLY information that is EXPLICITLY mentioned in the user's response.

Target fields to extract: ${targetFields.join(', ')}
User response: "${userResponse}"

Existing data context: ${JSON.stringify(existingData)}

CRITICAL RULES:
- Only extract information that is CLEARLY and EXPLICITLY stated
- If information is not mentioned or unclear, return null for that field
- Do NOT make assumptions, inferences, or use default values
- Do NOT guess based on context or common sense
- Be extremely conservative - when in doubt, return null

Field categories (only use if EXPLICITLY mentioned):

problemType: customer_support|sales_automation|data_analysis|finance_management|operations|marketing|hr_recruiting|other
problemTypeCategory: automation|analytics|management|communication|other

jobFunction: ceo|cto|vp_engineering|director|manager|analyst|consultant|other
jobFunctionCategory: executive|management|individual_contributor

industry: technology|healthcare|finance|retail|manufacturing|education|government|other
industryCategory: tech|service|product|government

solutionType: off_shelf|custom_build|hybrid
solutionTypeCategory: buy|build|partner

implementationCapacity: internal_team|external_help|mixed|unknown
implementationCapacityCategory: internal|external|hybrid

techCapability: high|medium|low|unknown
techCapabilityCategory: technical|non_technical|mixed

businessUrgency: immediate|3_months|6_months|1_year|exploring
businessUrgencyCategory: urgent|planned|research

decisionRole: final_decision|influence|research|unknown
decisionRoleCategory: decision_maker|influencer|researcher

budgetStatus: allocated|planning|exploring|unknown
budgetStatusCategory: approved|pending|research

budgetAmount: extract any specific dollar amounts mentioned (numbers only)

Example:
User: "I think maybe we need something"
Expected output: {} (empty object - nothing explicit)

User: "I'm a manager and we need sales help"
Expected output: {"jobFunction": "manager", "jobFunctionCategory": "management", "problemType": "sales_automation", "problemTypeCategory": "automation"}

Return valid JSON only. Use null for missing fields, not empty strings or defaults.`;

    try {
      const response = await this.openai.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: 'You are an expert at extracting structured business data. Always return valid JSON.' },
          { role: 'user', content: extractionPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const extracted = JSON.parse(response.choices[0].message.content);
      console.log('🎯 Extracted data:', extracted);
      return extracted;
    } catch (error) {
      console.error('Data extraction error:', error);
      return {};
    }
  }

  /**
   * Generate intelligent follow-up question for missing data
   */
  async generateFollowUpQuestion(missingFields, previousResponse, currentQuestion, isOptional = false) {
    const followUpPrompt = `Generate a natural follow-up question to gather missing information.

Context: User just answered "${previousResponse}" for the question "${currentQuestion.question}"

Missing fields needed: ${missingFields.join(', ')}
Is this optional data: ${isOptional}

Generate a short, conversational follow-up question that would naturally extract one or more of the missing fields. Don't mention "fields" or be technical. Keep it conversational and human.

Examples:
- For missing industry: "What industry is your company in?"
- For missing jobFunction: "What's your role at the company?"
- For missing budgetAmount: "Do you have a rough budget range in mind?"

Return just the question text, no quotes or formatting.`;

    try {
      const response = await this.openai.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: 'You are an expert conversationalist who asks natural follow-up questions.' },
          { role: 'user', content: followUpPrompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Follow-up generation error:', error);
      return `Could you tell me a bit more about ${missingFields[0].replace(/([A-Z])/g, ' $1').toLowerCase()}?`;
    }
  }

  /**
   * Helper methods
   */
  async getQualificationState(conversationId) {
    const result = await db.query(
      'SELECT * FROM qualification_responses WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rows[0] || null;
  }

  async updateQualificationData(conversationId, data) {
    await db.query(
      'UPDATE qualification_responses SET extracted_data = $1 WHERE conversation_id = $2',
      [JSON.stringify(data), conversationId]
    );
  }

  async updateCurrentStep(conversationId, step) {
    await db.query(
      'UPDATE qualification_responses SET current_step = $1 WHERE conversation_id = $2',
      [step, conversationId]
    );
  }

  getMissingRequiredFields(requiredFields, extractedData) {
    return requiredFields.filter(field => 
      !extractedData[field] || 
      extractedData[field] === null || 
      extractedData[field] === undefined ||
      extractedData[field] === ''
    );
  }

  getMissingOptionalFields(targetFields, requiredFields, extractedData) {
    const optionalFields = targetFields.filter(field => !requiredFields.includes(field));
    return optionalFields.filter(field => !extractedData[field]);
  }

  calculateProgress(currentStep, isComplete) {
    if (isComplete) return 100;
    return Math.round((currentStep / 4) * 100);
  }

  calculateSectionProgress(currentStep, extractedData, currentQuestion) {
    const baseProgress = Math.round(((currentStep - 1) / 4) * 100);
    const sectionProgress = Math.round((25 / 4) * 100); // Each section is 25%
    
    // Calculate completion within current section
    const requiredCount = currentQuestion.requiredFields.length;
    const filledRequired = currentQuestion.requiredFields.filter(field => extractedData[field]).length;
    const sectionCompletion = requiredCount > 0 ? (filledRequired / requiredCount) : 1;
    
    return Math.min(100, baseProgress + Math.round(sectionCompletion * 25));
  }

  getHighValueOptionalFields(optionalFields, currentStep) {
    // Define high-value optional fields per step
    const highValueByStep = {
      1: ['industryCategory', 'jobFunctionCategory'], // Industry and role details
      2: ['techCapabilityCategory'], // Technical capability is valuable
      3: ['decisionRoleCategory'], // Decision authority is important  
      4: ['budgetAmount'] // Specific budget amount is very valuable
    };
    
    const stepHighValue = highValueByStep[currentStep] || [];
    return optionalFields.filter(field => stepHighValue.includes(field)).slice(0, 2); // Max 2
  }

  async markOptionalAsked(conversationId) {
    await db.query(
      'UPDATE qualification_responses SET optional_asked = true WHERE conversation_id = $1',
      [conversationId]
    );
  }

  async resetOptionalAsked(conversationId) {
    await db.query(
      'UPDATE qualification_responses SET optional_asked = false WHERE conversation_id = $1',
      [conversationId]
    );
  }

  async completeQualification(conversationId, finalData) {
    await db.query(
      `UPDATE qualification_responses 
       SET status = 'completed', completed_at = NOW(), extracted_data = $1
       WHERE conversation_id = $2`,
      [JSON.stringify(finalData), conversationId]
    );

    await db.query(
      `UPDATE prospect_conversations 
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [conversationId]
    );
  }
}

module.exports = StructuredQualificationService;