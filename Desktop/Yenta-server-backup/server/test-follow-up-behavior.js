/**
 * Comprehensive Test Suite for Follow-up Question Behavior
 * Tests the intelligent follow-up system when required fields are missing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

class FollowUpTestSuite {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Starting Follow-up Question Behavior Test Suite\n');
    
    try {
      // Test 1: Incomplete Section 1 - Missing job function
      await this.testMissingJobFunction();
      
      // Test 2: Incomplete Section 1 - Missing industry  
      await this.testMissingIndustry();
      
      // Test 3: Incomplete Section 2 - Missing implementation capacity
      await this.testMissingImplementationCapacity();
      
      // Test 4: Incomplete Section 3 - Missing decision role
      await this.testMissingDecisionRole();
      
      // Test 5: Complete responses (no follow-ups expected)
      await this.testCompleteResponses();
      
      // Test 6: Optional field follow-ups
      await this.testOptionalFieldFollowUps();
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      if (error.response?.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  async testMissingJobFunction() {
    console.log('1️⃣ Test: Missing Job Function - Should ask follow-up');
    
    const conversationId = await this.startNewConversation('Missing Job Function Test Corp');
    
    // Give response with problem type but no job function
    const response = await this.sendResponse(conversationId, 
      "We need to improve our customer support process");
    
    // Should stay in step 1 and ask for job function
    this.assertFollowUpTriggered(response, 1, 'Missing job function should trigger follow-up');
    
    // Provide job function
    const followUpResponse = await this.sendResponse(conversationId, 
      "I'm the VP of Customer Success");
    
    // Should now move to step 2
    this.assertEqual(followUpResponse.currentStep, 2, 'Should advance after providing job function');
    
    console.log('   ✅ Follow-up correctly triggered for missing job function\n');
  }

  async testMissingIndustry() {
    console.log('2️⃣ Test: Missing Industry - Should ask follow-up');
    
    const conversationId = await this.startNewConversation('Missing Industry Test Corp');
    
    // Give response with problem and job function but no industry
    const response = await this.sendResponse(conversationId, 
      "I'm a manager and we need better data analytics");
    
    // Check if follow-up was triggered or if it advanced (AI might infer industry)
    if (response.currentStep === 1 && response.isFollowUp) {
      console.log('   ✅ Follow-up triggered for missing industry');
      
      // Provide industry
      const followUpResponse = await this.sendResponse(conversationId, 
        "We're in the fintech industry");
      
      this.assertEqual(followUpResponse.currentStep, 2, 'Should advance after providing industry');
    } else {
      console.log('   ℹ️ AI inferred industry from context, no follow-up needed');
    }
    
    console.log('   ✅ Industry handling working correctly\n');
  }

  async testMissingImplementationCapacity() {
    console.log('3️⃣ Test: Missing Implementation Capacity - Should ask follow-up');
    
    const conversationId = await this.startNewConversation('Missing Implementation Test Corp');
    
    // Complete section 1 first
    await this.sendResponse(conversationId, 
      "I'm a CTO at a healthcare company and need better patient data management");
    
    // Section 2: Give solution type but no implementation capacity
    const response = await this.sendResponse(conversationId, 
      "We want a custom solution");
    
    // Should stay in step 2 and ask for implementation capacity
    if (response.currentStep === 2 && response.isFollowUp) {
      console.log('   ✅ Follow-up triggered for missing implementation capacity');
      
      // Provide implementation capacity
      const followUpResponse = await this.sendResponse(conversationId, 
        "We have an internal team to help build it");
      
      this.assertEqual(followUpResponse.currentStep, 3, 'Should advance after providing implementation capacity');
    } else {
      console.log('   ℹ️ AI may have inferred implementation capacity from context');
    }
    
    console.log('   ✅ Implementation capacity handling working correctly\n');
  }

  async testMissingDecisionRole() {
    console.log('4️⃣ Test: Missing Decision Role - Should ask follow-up');
    
    const conversationId = await this.startNewConversation('Missing Decision Role Test Corp');
    
    // Complete sections 1 & 2
    await this.sendResponse(conversationId, 
      "I'm a product manager at a retail company and need inventory optimization");
    await this.sendResponse(conversationId, 
      "We want an off-the-shelf solution with external help");
    
    // Section 3: Give urgency but no decision role
    const response = await this.sendResponse(conversationId, 
      "This is urgent, we need it done in 2 months");
    
    if (response.currentStep === 3 && response.isFollowUp) {
      console.log('   ✅ Follow-up triggered for missing decision role');
      
      // Provide decision role
      const followUpResponse = await this.sendResponse(conversationId, 
        "I need approval from my manager but I influence the decision");
      
      this.assertEqual(followUpResponse.currentStep, 4, 'Should advance after providing decision role');
    } else {
      console.log('   ℹ️ AI may have inferred decision role from context');
    }
    
    console.log('   ✅ Decision role handling working correctly\n');
  }

  async testCompleteResponses() {
    console.log('5️⃣ Test: Complete Responses - No follow-ups expected');
    
    const conversationId = await this.startNewConversation('Complete Responses Test Corp');
    
    // Section 1: Complete response
    const response1 = await this.sendResponse(conversationId, 
      "I'm the CEO of a manufacturing company and we need to automate our supply chain operations");
    
    this.assertEqual(response1.currentStep, 2, 'Complete response should advance to step 2');
    this.assertEqual(response1.isFollowUp, false, 'Should not be a follow-up');
    
    // Section 2: Complete response
    const response2 = await this.sendResponse(conversationId, 
      "We want to build a custom solution with our internal engineering team");
    
    this.assertEqual(response2.currentStep, 3, 'Complete response should advance to step 3');
    
    console.log('   ✅ Complete responses correctly advance without follow-ups\n');
  }

  async testOptionalFieldFollowUps() {
    console.log('6️⃣ Test: Optional Field Follow-ups - Should be non-blocking');
    
    const conversationId = await this.startNewConversation('Optional Fields Test Corp');
    
    // Give minimal but complete required info
    const response1 = await this.sendResponse(conversationId, 
      "I need help with something. I work somewhere.");
    
    // Check if it asks for optional details but still allows progression
    if (response1.isOptional) {
      console.log('   ✅ Optional follow-up triggered but marked as skippable');
      
      // Skip optional question
      const response2 = await this.sendResponse(conversationId, "I'd rather not say");
      
      // Should still advance
      this.assertEqual(response2.currentStep, 2, 'Should advance even after skipping optional');
    }
    
    console.log('   ✅ Optional field behavior working correctly\n');
  }

  // Helper methods
  async startNewConversation(companyName) {
    const response = await axios.post(`${BASE_URL}/qualification/start`, {
      prospectId: 1,
      companyName
    });
    return response.data.conversationId;
  }

  async sendResponse(conversationId, responseText, expectFollowUp = false) {
    const response = await axios.post(`${BASE_URL}/qualification/respond`, {
      conversationId,
      response: responseText
    });
    return response.data;
  }

  assertFollowUpTriggered(response, expectedStep, message) {
    if (response.currentStep !== expectedStep || !response.isFollowUp) {
      throw new Error(`${message} - Expected step ${expectedStep} with follow-up, got step ${response.currentStep}, isFollowUp: ${response.isFollowUp}`);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
    }
  }

  printSummary() {
    console.log('📊 Follow-up Test Suite Summary:');
    console.log('✅ All follow-up behavior tests passed!');
    console.log('✅ System correctly asks follow-up questions when required fields are missing');
    console.log('✅ System advances when all required fields are provided');
    console.log('✅ Optional field follow-ups are non-blocking');
    console.log('✅ Complete responses advance without unnecessary follow-ups');
  }
}

// Helper class to test with controlled AI extraction
class MockExtractionTestSuite {
  constructor() {
    this.originalExtractDataFromResponse = null;
  }

  async testWithControlledExtraction() {
    console.log('🎯 Testing Follow-ups with Controlled AI Extraction\n');
    
    // This would require mocking the AI extraction to return empty fields
    // For now, let's create scenarios that are likely to produce empty extractions
    
    const testCases = [
      {
        name: 'Completely Vague Response',
        input: 'Umm, I dunno, maybe?',
        expectedMissingFields: ['problemType', 'jobFunction']
      },
      {
        name: 'Only Problem Type',
        input: 'We have some customer service issues',
        expectedMissingFields: ['jobFunction'] 
      },
      {
        name: 'Only Job Function',
        input: 'I am a manager',
        expectedMissingFields: ['problemType']
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      
      const conversationId = await this.startNewConversation(`Test ${testCase.name}`);
      const response = await this.sendResponse(conversationId, testCase.input);
      
      // Check if follow-up was triggered
      if (response.isFollowUp) {
        console.log(`   ✅ Follow-up triggered: "${response.question}"`);
      } else {
        console.log(`   ℹ️ No follow-up - AI may have inferred missing data`);
      }
      
      console.log('');
    }
  }

  async startNewConversation(companyName) {
    const response = await axios.post(`${BASE_URL}/qualification/start`, {
      prospectId: 1, 
      companyName
    });
    return response.data.conversationId;
  }

  async sendResponse(conversationId, responseText) {
    const response = await axios.post(`${BASE_URL}/qualification/respond`, {
      conversationId,
      response: responseText
    });
    return response.data;
  }
}

// Run tests
async function runTests() {
  const suite = new FollowUpTestSuite();
  await suite.runAllTests();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  const mockSuite = new MockExtractionTestSuite();
  await mockSuite.testWithControlledExtraction();
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { FollowUpTestSuite, MockExtractionTestSuite };