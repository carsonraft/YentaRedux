require('dotenv').config();
const openaiService = require('./services/openai');

async function testCompletionDetection() {
  console.log('🧪 TESTING CONVERSATION COMPLETION DETECTION\n');

  // Test 1: Empty conversation (should be incomplete)
  console.log('=== TEST 1: Empty Conversation ===');
  const emptyMessages = [
    { role: 'system', content: openaiService.SYSTEM_PROMPT },
    { role: 'assistant', content: 'Hello! I want to find you an AI vendor...' }
  ];
  
  let check = await openaiService.checkConversationCompleteness(emptyMessages);
  console.log(`Complete: ${check.isComplete}`);
  console.log(`Score: ${check.completenessScore}%`);
  console.log(`Missing: ${check.missingFields.join(', ')}\n`);

  // Test 2: Partial conversation (should be incomplete)
  console.log('=== TEST 2: Partial Conversation ===');
  const partialMessages = [
    { role: 'system', content: openaiService.SYSTEM_PROMPT },
    { role: 'assistant', content: 'Hello! I want to find you an AI vendor...' },
    { role: 'user', content: 'We need help with our hiring process' },
    { role: 'assistant', content: 'Tell me more about your hiring challenges.' },
    { role: 'user', content: 'We are a tech company and it takes too long to screen resumes' }
  ];
  
  check = await openaiService.checkConversationCompleteness(partialMessages);
  console.log(`Complete: ${check.isComplete}`);
  console.log(`Score: ${check.completenessScore}%`);
  console.log(`Missing: ${check.missingFields.join(', ')}`);
  console.log(`Unclear: ${check.unclearFields.join(', ')}\n`);

  // Test 3: Complete conversation (should be complete)
  console.log('=== TEST 3: Complete Conversation ===');
  const completeMessages = [
    { role: 'system', content: openaiService.SYSTEM_PROMPT },
    { role: 'assistant', content: 'Hello! I want to find you an AI vendor...' },
    { role: 'user', content: 'We need help with our hiring process at our tech company' },
    { role: 'assistant', content: 'Tell me more about your hiring challenges.' },
    { role: 'user', content: 'Manual screening takes too long. We want an off-the-shelf ATS solution.' },
    { role: 'assistant', content: 'How urgent is this for you?' },
    { role: 'user', content: 'Very urgent - we need it in 2 months. I am the hiring director with full decision authority.' },
    { role: 'assistant', content: 'What about budget?' },
    { role: 'user', content: 'We have $40k approved for this.' }
  ];
  
  check = await openaiService.checkConversationCompleteness(completeMessages);
  console.log(`Complete: ${check.isComplete}`);
  console.log(`Score: ${check.completenessScore}%`);
  console.log(`Missing: ${check.missingFields.join(', ') || 'None'}`);
  console.log(`Unclear: ${check.unclearFields.join(', ') || 'None'}`);
  
  if (check.extractedData) {
    console.log('\nExtracted Data:');
    console.log(JSON.stringify(check.extractedData.structured, null, 2));
  }

  console.log('\n✅ COMPLETION DETECTION TESTS FINISHED');
}

// Run the test
if (require.main === module) {
  testCompletionDetection().catch(console.error);
}

module.exports = testCompletionDetection;