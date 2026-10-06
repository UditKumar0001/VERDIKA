import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

async function listModels() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log('API Status:', res.status);
    if (data.models) {
      console.log('Available Models:', data.models.map(m => m.name.replace('models/', '')));
    } else {
      console.log('Response:', data);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

listModels();
