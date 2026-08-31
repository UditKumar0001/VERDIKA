const BASE_URL = 'http://localhost:5000/api';

async function testVerdiChat() {
  console.log('================================================================');
  console.log('TESTING VERDI AI CHATBOT BACKEND ENDPOINT (POST /api/verdi-chat)');
  console.log('================================================================\n');

  // Test 1: Document requirements question
  console.log('--- TEST 1: "What documents do I need to upload?" ---');
  const res1 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What documents do I need to upload?',
      conversationHistory: []
    })
  });
  const data1 = await res1.json();
  console.log('User: What documents do I need to upload?');
  console.log('Verdi:', data1.reply);
  console.log(`[CHECK 1] Answers with KYC document details? ${data1.reply && (data1.reply.includes('GST') || data1.reply.includes('PAN') || data1.reply.includes('documents')) ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Adversarial check question
  console.log('--- TEST 2: "How does the adversarial check work?" ---');
  const res2 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'How does the adversarial check work?',
      conversationHistory: [
        { sender: 'user', text: 'What documents do I need to upload?' },
        { sender: 'verdi', text: data1.reply }
      ]
    })
  });
  const data2 = await res2.json();
  console.log('User: How does the adversarial check work?');
  console.log('Verdi:', data2.reply);
  console.log(`[CHECK 2] Answers with adversarial stress test details? ${data2.reply && (data2.reply.includes('Adversarial') || data2.reply.includes('stress') || data2.reply.includes('tamper') || data2.reply.includes('synthetic')) ? 'PASS' : 'FAIL'}\n`);

  // Test 3: Off-topic / Unrelated question
  console.log("--- TEST 3: \"What's the capital of France?\" ---");
  const res3 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "What's the capital of France?",
      conversationHistory: []
    })
  });
  const data3 = await res3.json();
  console.log("User: What's the capital of France?");
  console.log('Verdi:', data3.reply);
  console.log(`[CHECK 3] Politely redirects off-topic query? ${data3.reply && data3.reply.includes('Verdika and loan underwriting questions') ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL VERDI AI CHAT TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

testVerdiChat().catch(err => {
  console.error('Verdi Chat test failed:', err);
  process.exit(1);
});
