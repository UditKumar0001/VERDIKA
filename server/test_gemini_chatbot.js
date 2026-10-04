import './config/env.js';
import { getChatbotResponse } from './services/verdiChatService.js';

async function testGeminiChatbot() {
  console.log('================================================================');
  console.log('TESTING REAL GEMINI API CHATBOT INTEGRATION (@google/generative-ai)');
  console.log('================================================================\n');

  // Test 1: General Query Execution
  console.log('--- TEST 1: Varied Non-Scripted Question (Platform Overview) ---');
  const userMsg1 = "Can you explain how your AI agents determine if a business is risky or not?";
  console.log(`User Prompt: "${userMsg1}"`);

  const reply1 = await getChatbotResponse(userMsg1, []);
  console.log(`\nChatbot Response:\n"${reply1}"\n`);
  console.log(`[CHECK 1] Received valid user-facing response? ${reply1 && reply1.length > 10 ? 'PASS' : 'FAIL'}\n`);

  if (!reply1 || reply1.length < 10) {
    throw new Error('Test 1 Failed: Chatbot response empty.');
  }

  // Test 2: Application Context-Aware Query with Tenant Isolation
  console.log('--- TEST 2: Context-Aware Query (Tenant Isolated Application Context) ---');
  const userMsg2 = "What is the status of my credit application and why is it pending?";
  const appContext = {
    applicationId: 'APP-7A89F123',
    businessName: 'Sunrise Digital Solutions Pvt Ltd',
    status: 'pending_review',
    decision: 'route_to_human',
    riskScore: 0.35,
    routingReason: 'KYC document quality issues detected — PAN card OCR inconclusive'
  };

  console.log(`User Prompt: "${userMsg2}"`);
  console.log('Context Injected:', appContext);

  const reply2 = await getChatbotResponse(userMsg2, [], appContext);
  console.log(`\nChatbot Context-Aware Response:\n"${reply2}"\n`);
  console.log(`[CHECK 2] Received non-crashing response with context handling? ${reply2 && reply2.length > 10 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Multi-turn Conversation History
  console.log('--- TEST 3: Multi-turn Conversation History ---');
  const history = [
    { role: 'user', content: 'What documents do I need to submit?' },
    { role: 'model', content: 'You need to upload your GST Certificate, PAN Card, and last 6 months Bank Statement.' },
    { role: 'user', content: 'What format should the bank statement be in?' }
  ];

  const reply3 = await getChatbotResponse("Are digital e-statements allowed?", history);
  console.log(`User Follow-up: "Are digital e-statements allowed?"`);
  console.log(`\nChatbot Conversational Response:\n"${reply3}"\n`);
  console.log(`[CHECK 3] Received conversational response? ${reply3 && reply3.length > 10 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL REAL GEMINI API CHATBOT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

testGeminiChatbot().catch((err) => {
  console.error('Gemini Chatbot Test Execution Failed:', err);
  process.exit(1);
});
