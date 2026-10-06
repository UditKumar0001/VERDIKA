import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
console.log('Using Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');

async function testModels() {
  if (!apiKey) {
    console.log('No key found!');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);

  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.0-flash', 'gemini-2.5-flash'];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say hello in 3 words');
      console.log(`SUCCESS [${m}]:`, res.response.text());
      return;
    } catch (err) {
      console.log(`FAILED [${m}]:`, err.status || err.statusCode || '', err.message);
    }
  }
}

testModels();
