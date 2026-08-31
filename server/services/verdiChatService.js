import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `You are Verdi, the AI assistant for Verdika — an AI-powered loan underwriting platform for finance companies. You help two types of users: (1) merchants applying for a loan, who may ask about what documents they need, how long approval takes, or what the process looks like, and (2) finance company reviewers, who may ask about how the risk scoring works, what the agents do (DataAgent, DocumentVerificationAgent, RiskAgent, AdversarialAgent, DecisionRouter, ExplainerAgent), or how to read the PDF report. Only answer questions related to Verdika, loan underwriting, credit risk concepts, or how to use this platform. If asked something completely unrelated (general knowledge, coding help, etc.), politely redirect: 'I'm here to help with Verdika and loan underwriting questions — is there something about the platform I can help with?' Keep answers concise (2-4 sentences), friendly, and in the same language the user writes in (English or Hindi/Hinglish).`;

/**
 * Knowledge Base Fallback for when GEMINI_API_KEY is not provided or offline
 */
const VERDI_KNOWLEDGE_BASE = [
  {
    keywords: ['document', 'upload', 'kyc', 'pan', 'gst', 'bank statement', 'pdf', 'image'],
    answer: 'To apply on Verdika, you need 3 core KYC documents: a GST Registration Certificate (.pdf/.png), a PAN Card (.pdf/.png, min 600px width), and Bank Statements for the last 6 months (.pdf). You also need to enter your bank account number and a verified IFSC code.'
  },
  {
    keywords: ['adversarial', 'stress test', 'tamper', 'manipulat', 'gaming', 'fraud'],
    answer: "Verdika's AdversarialAgent runs simulated stress tests on historical transaction velocity, revenue linearity, and refund spikes to detect synthetic data manipulation or timeline tampering before a loan is approved."
  },
  {
    keywords: ['risk score', 'scoring', 'how it works', 'pipeline', 'agents', 'models'],
    answer: 'Verdika utilizes a 6-agent autonomous pipeline: DataAgent extracts features, DocumentVerificationAgent audits KYC quality, RiskAgent computes a 0-100% risk score, AdversarialAgent checks data integrity, DecisionRouter applies policy rules, and ExplainerAgent generates transparent audit summaries.'
  },
  {
    keywords: ['approval', 'time', 'how long', 'fast', 'duration'],
    answer: 'Our autonomous multi-agent pipeline evaluates clean applications in under 3 seconds! If an application is flagged for manual review (e.g. missing documents or borderline risk), underwriters typically review and close it within a few business hours.'
  },
  {
    keywords: ['multi-tenant', 'company', 'institution', 'shareable', 'slug', 'public link'],
    answer: 'Finance companies can create tenant accounts on Verdika to receive dedicated public application links (/apply/your-company). All merchant submissions are automatically isolated to that company\'s private review queue.'
  },
  {
    keywords: ['pdf', 'report', 'download report', 'recommendation'],
    answer: 'Underwriters can click "Download Full Report (PDF)" on any application to generate a comprehensive 2-page report featuring an executive Reviewer Recommendation card, KYC document quality checklists, quantitative risk breakdowns, and multi-agent audit logs.'
  }
];

const UNRELATED_PATTERNS = [
  'capital of', 'weather in', 'president', 'write code', 'recipe', 'song', 'joke', 'movie', 'who is', 'history of'
];

/**
 * Generates chat response using Google Gemini API with fallback
 * @param {string} userMessage 
 * @param {Array} conversationHistory 
 * @returns {Promise<string>} Verdi AI response
 */
export async function generateVerdiChatResponse(userMessage, conversationHistory = []) {
  const cleanMessage = String(userMessage || '').trim();
  if (!cleanMessage) return "How can I help you with your loan application or underwriting evaluation?";

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // If Gemini API Key is configured, attempt Google Gemini API call
  if (geminiApiKey) {
    try {
      // Build conversation contents for Gemini (limiting to last 6 messages)
      const recentHistory = (conversationHistory || []).slice(-6);
      const contents = [];

      for (const msg of recentHistory) {
        if (!msg.text) continue;
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }

      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: cleanMessage }]
      });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 250
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText && responseText.trim().length > 0) {
          return responseText.trim();
        }
      } else {
        const errText = await res.text();
        logger.warn('[VerdiChat Gemini API Warning]:', errText);
      }
    } catch (err) {
      logger.warn('[VerdiChat Gemini API Call Exception]:', err.message);
    }
  }

  // Smart Contextual Fallback Engine (Strictly Scoped)
  const lower = cleanMessage.toLowerCase();

  // 1. Check for off-topic queries
  const isOffTopic = UNRELATED_PATTERNS.some((pat) => lower.includes(pat));
  if (isOffTopic) {
    return "I'm here to help with Verdika and loan underwriting questions — is there something about the platform I can help with?";
  }

  // 2. Match knowledge base topics
  for (const item of VERDI_KNOWLEDGE_BASE) {
    const matchCount = item.keywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount > 0) {
      return item.answer;
    }
  }

  // 3. Default friendly scoped response
  return "I'm here to assist you with Verdika's loan underwriting platform, document requirements, and AI risk evaluations. Feel free to ask about our multi-agent pipeline, KYC verification, or underwriting reports!";
}
