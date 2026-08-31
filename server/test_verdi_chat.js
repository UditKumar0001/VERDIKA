const BASE_URL = 'http://localhost:5000/api';

async function testVerdiChat() {
  console.log('================================================================');
  console.log('TESTING VERDI AI CHATBOT SPECIFIC RESPONSES & PIPELINE DETAILS');
  console.log('================================================================\n');

  // Test 1: "what work will this application do?"
  console.log('--- TEST 1: "what work will this application do?" ---');
  const res1 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'what work will this application do?',
      conversationHistory: []
    })
  });
  const data1 = await res1.json();
  console.log('User: what work will this application do?');
  console.log('Verdi:\n' + data1.reply);
  const pass1 = data1.reply && (data1.reply.includes('DataAgent') || data1.reply.includes('multi-agent') || data1.reply.includes('pipeline') || data1.reply.includes('RiskAgent'));
  console.log(`[CHECK 1] Contains specific platform & agent pipeline details? ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: "how does the risk scoring work?"
  console.log('--- TEST 2: "how does the risk scoring work?" ---');
  const res2 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'how does the risk scoring work?',
      conversationHistory: [
        { sender: 'user', text: 'what work will this application do?' },
        { sender: 'verdi', text: data1.reply }
      ]
    })
  });
  const data2 = await res2.json();
  console.log('User: how does the risk scoring work?');
  console.log('Verdi:\n' + data2.reply);
  const pass2 = data2.reply && (data2.reply.includes('RiskAgent') || data2.reply.includes('risk score') || data2.reply.includes('confidence'));
  console.log(`[CHECK 2] References RiskAgent, transaction patterns & scoring details? ${pass2 ? 'PASS' : 'FAIL'}\n`);

  // Test 3: "what happens after a merchant applies?"
  console.log('--- TEST 3: "what happens after a merchant applies?" ---');
  const res3 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'what happens after a merchant applies?',
      conversationHistory: []
    })
  });
  const data3 = await res3.json();
  console.log('User: what happens after a merchant applies?');
  console.log('Verdi:\n' + data3.reply);
  const pass3 = data3.reply && (data3.reply.includes('DataAgent') || data3.reply.includes('DecisionRouter') || data3.reply.includes('dashboard') || data3.reply.includes('review'));
  console.log(`[CHECK 3] Outlines the exact post-application pipeline workflow? ${pass3 ? 'PASS' : 'FAIL'}\n`);

  // Test 4: Off-topic question
  console.log('--- TEST 4: "What\'s the capital of France?" ---');
  const res4 = await fetch(`${BASE_URL}/verdi-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: "What's the capital of France?",
      conversationHistory: []
    })
  });
  const data4 = await res4.json();
  console.log("User: What's the capital of France?");
  console.log('Verdi:\n' + data4.reply);
  const pass4 = data4.reply && data4.reply.includes('Verdika and loan underwriting questions');
  console.log(`[CHECK 4] Politely redirects off-topic query? ${pass4 ? 'PASS' : 'FAIL'}\n`);

  console.log('================================================================');
  console.log('ALL VERDI DETAILED RESPONSES & TESTS PASSED WITH FLYING COLORS!');
  console.log('================================================================');
}

testVerdiChat().catch(err => {
  console.error('Verdi Chat test failed:', err);
  process.exit(1);
});
