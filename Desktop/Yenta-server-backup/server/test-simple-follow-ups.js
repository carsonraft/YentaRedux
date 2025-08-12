/**
 * Simple Follow-up Test - Manual step-by-step verification
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:3001/api';

async function testFollowUpBehavior() {
  console.log('🧪 Testing Follow-up Question Behavior\n');

  try {
    // Test 1: Start conversation
    console.log('1️⃣ Starting conversation...');
    const startResponse = await axios.post(`${BASE_URL}/qualification/start`, {
      prospectId: 1,
      companyName: 'Follow-up Test Corp'
    });
    const conversationId = startResponse.data.conversationId;
    console.log(`   Conversation ID: ${conversationId}\n`);

    // Test 2: Give vague response (should trigger follow-up)
    console.log('2️⃣ Testing vague response: "I need help"');
    const vague = await axios.post(`${BASE_URL}/qualification/respond`, {
      conversationId,
      response: 'I need help'
    });
    
    console.log(`   Current Step: ${vague.data.currentStep}`);
    console.log(`   Is Follow-up: ${vague.data.isFollowUp}`);
    console.log(`   Missing Required: ${JSON.stringify(vague.data.missingRequired)}`);
    console.log(`   Question: "${vague.data.question}"\n`);

    // Test 3: Provide job function only
    console.log('3️⃣ Providing job function: "I am a director"');
    const jobOnly = await axios.post(`${BASE_URL}/qualification/respond`, {
      conversationId,
      response: 'I am a director'
    });
    
    console.log(`   Current Step: ${jobOnly.data.currentStep}`);
    console.log(`   Is Follow-up: ${jobOnly.data.isFollowUp}`);
    console.log(`   Missing Required: ${JSON.stringify(jobOnly.data.missingRequired)}`);
    console.log(`   Question: "${jobOnly.data.question}"\n`);

    // Test 4: Provide problem type
    console.log('4️⃣ Providing problem type: "We need sales automation"');
    const problemType = await axios.post(`${BASE_URL}/qualification/respond`, {
      conversationId,
      response: 'We need sales automation'
    });
    
    console.log(`   Current Step: ${problemType.data.currentStep}`);
    console.log(`   Is Follow-up: ${problemType.data.isFollowUp}`);
    console.log(`   Section Complete: ${problemType.data.sectionComplete}`);
    console.log(`   Progress: ${problemType.data.progress}%`);
    console.log(`   Question: "${problemType.data.question}"\n`);

    // Get current state
    console.log('5️⃣ Checking final state...');
    const results = await axios.get(`${BASE_URL}/qualification/${conversationId}/status`);
    console.log('   Final extracted data:');
    console.log('   ', JSON.stringify(results.data.extractedData, null, 2));

    console.log('\n✅ Follow-up behavior test completed successfully!');
    
    if (problemType.data.currentStep === 2) {
      console.log('✅ System correctly advanced to step 2 after getting required fields');
    } else {
      console.log('⚠️ System did not advance - check if all required fields were captured');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testFollowUpBehavior();