require('dotenv').config();
const openaiService = require('./services/openai');

async function simulateATSConversation() {
  console.log('🤖 SIMULATING FULL ATS HIRING CONVERSATION\n');

  // Start conversation
  console.log('=== STARTING CONVERSATION ===');
  const { messages, response } = await openaiService.startConversation('TechCorp');
  console.log('🤖 AI:', response);
  console.log();

  let conversationMessages = [...messages];

  // Simulate conversation flow
  const userMessages = [
    // Question 1: Understanding the Problem
    "We're struggling with our hiring process. It's taking way too long to screen candidates and our HR team is overwhelmed.",
    
    // Follow-up on problem details
    "We're a mid-size tech company with about 200 employees. We post jobs and get hundreds of applications, but manually reviewing resumes and scheduling interviews is killing us. It takes weeks to fill positions.",
    
    // Question 2: Solution Preference (Build vs Buy)
    "We'd prefer something we can implement quickly rather than building from scratch. Our IT team is pretty capable but they're busy with other projects.",
    
    // Question 3: Business Urgency
    "This is becoming urgent. We have 15 open positions and our current manual process is causing us to lose good candidates to competitors. We need something in place within the next 2-3 months.",
    
    // Question 4: Budget
    "We have budget approved for this. HR got sign-off for up to $50k annually for an ATS solution. I'm the VP of Operations and I have authority to make this decision.",
    
    // Final clarification
    "Yes, we want something that can automatically screen resumes, rank candidates, and integrate with our current tools like Slack and Google Workspace."
  ];

  // Process each user message
  for (let i = 0; i < userMessages.length; i++) {
    const userMessage = userMessages[i];
    
    console.log(`👤 User: ${userMessage}`);
    
    // Add user message to conversation
    conversationMessages.push({ role: 'user', content: userMessage });
    
    // Get AI response
    try {
      const aiResponse = await openaiService.getChatCompletion(conversationMessages);
      console.log(`🤖 AI: ${aiResponse}`);
      console.log();
      
      // Add AI response to conversation
      conversationMessages.push({ role: 'assistant', content: aiResponse });
      
    } catch (error) {
      console.error('❌ Error getting AI response:', error.message);
      break;
    }
  }

  console.log('\n=== EXTRACTING STRUCTURED DATA ===');
  
  try {
    const extractedData = await openaiService.extractInfo(conversationMessages);
    
    console.log('\n📊 EXTRACTED STRUCTURED DATA:');
    console.log(JSON.stringify(extractedData.structured, null, 2));
    
    console.log('\n📝 CONTEXT DATA:');
    console.log(JSON.stringify(extractedData.context, null, 2));
    
    console.log('\n🔍 ARTIFACTS:');
    console.log(JSON.stringify(extractedData.artifacts, null, 2));
    
    // Verify key fields are populated
    console.log('\n✅ VERIFICATION:');
    const structured = extractedData.structured;
    
    const checks = [
      ['Problem Type', structured.problemType],
      ['Problem Category', structured.problemTypeCategory],
      ['Industry', structured.industry],
      ['Industry Category', structured.industryCategory],
      ['Job Function', structured.jobFunction],
      ['Solution Type', structured.solutionType],
      ['Business Urgency', structured.businessUrgency],
      ['Decision Role', structured.decisionRole],
      ['Budget Status', structured.budgetStatus],
      ['Budget Amount', structured.budgetAmount]
    ];
    
    checks.forEach(([field, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`${status} ${field}: ${value || 'NOT SET'}`);
    });
    
  } catch (error) {
    console.error('❌ Error extracting data:', error.message);
  }

  console.log('\n🎉 SIMULATION COMPLETE');
}

// Run the simulation
if (require.main === module) {
  simulateATSConversation().catch(console.error);
}

module.exports = simulateATSConversation;