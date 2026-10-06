import 'dotenv/config';
import { getChatbotResponse } from './services/verdiChatService.js';

async function runLiveChatTest() {
  console.log('================================================================');
  console.log('TESTING VERDI CHATBOT WITH VARIED NATURAL LANGUAGE QUESTIONS');
  console.log('================================================================\n');

  const testPrompts = [
    { label: 'Simple greeting', prompt: 'hii' },
    { label: 'Platform underwriting question', prompt: 'How does Verdika evaluate risk score?' },
    { label: 'Document requirement question', prompt: 'Which documents should I submit for loan approval?' },
    { label: 'Contextual query', prompt: 'What is the status of my loan application?', context: { applicationId: 'APP-998811', status: 'pending_review', decision: 'route_to_human' } }
  ];

  for (const item of testPrompts) {
    console.log(`--- [TEST: ${item.label}] ---`);
    console.log(`User: "${item.prompt}"`);
    try {
      const response = await getChatbotResponse(item.prompt, [], item.context || null);
      console.log(`Verdi Bot: "${response}"\n`);
    } catch (err) {
      console.error(`Error:`, err.message);
    }
  }

  console.log('================================================================');
  console.log('VERDI CHATBOT LIVE RESPONSE TEST COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runLiveChatTest();
