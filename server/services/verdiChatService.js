import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `You are Verdi, the AI assistant for Verdika, a loan underwriting platform used by finance companies. 

Verdika works like this: A finance company signs up and gets a unique application link. They share this link with merchants who want to apply for a business loan. When a merchant applies, they submit: business details (name, category, GSTIN, registration date), bank details (account number, IFSC, account holder name), and documents (GST Certificate, PAN Card, Bank Statement).

Once submitted, a 5-agent AI pipeline automatically evaluates the application:
- DataAgent: enriches and verifies the submitted business data
- DocumentVerificationAgent: checks all documents are present, correctly formatted, and legible
- RiskAgent: calculates a risk score and confidence percentage based on transaction/revenue patterns
- AdversarialAgent: runs stress tests to detect fraud, fake data, or manipulation attempts
- DecisionRouter: combines all agent outputs to recommend Approve, Reject, or route to Manual Review
- ExplainerAgent: generates a plain-English explanation of the decision

A finance company's underwriter/reviewer then logs into their dashboard, sees the AI recommendation with full reasoning, and can download a detailed PDF report or take final action.

Answer questions about this platform specifically and in detail — explain the actual workflow, agents, and features when asked. If a merchant asks what happens after they apply, explain the pipeline in simple terms. If a reviewer asks how the risk score works, explain the agents involved. Keep answers to 3-5 sentences, be specific rather than generic, and match the user's language (English or Hindi/Hinglish). Only redirect if the question is truly unrelated to Verdika, lending, or credit risk (e.g. general knowledge, unrelated coding help).`;

/**
 * Knowledge Base Fallback with rich platform-specific reasoning
 */
const VERDI_KNOWLEDGE_BASE = [
  {
    keywords: ['work will this application do', 'what does this application do', 'what does this app do', 'what is this platform', 'what is verdika', 'purpose of this application', 'what work will this app do', 'overview'],
    answer: 'Verdika is an autonomous AI loan underwriting platform designed for finance companies and NBFCs. Finance companies generate unique application links to onboard merchants, who submit their business profile, bank settlement details, and KYC documents (GST, PAN, Bank Statement). Once submitted, a multi-agent AI pipeline (DataAgent, DocumentVerificationAgent, RiskAgent, AdversarialAgent, DecisionRouter, and ExplainerAgent) analyzes credit risk, detects synthetic data manipulation, and delivers instant underwriting recommendations with downloadable PDF audit reports.'
  },
  {
    keywords: ['happens after a merchant applies', 'after applying', 'after submission', 'merchant applies', 'application workflow', 'what happens next'],
    answer: 'Once a merchant submits an application, Verdika\'s multi-agent pipeline immediately kicks off: DataAgent and DocumentVerificationAgent verify business records and document quality, RiskAgent computes the credit risk score, and AdversarialAgent checks for fraudulent data manipulation. DecisionRouter then routes the application to Approve, Reject, or Manual Review, making the full multi-agent audit trail instantly available in the finance company\'s private reviewer dashboard.'
  },
  {
    keywords: ['document', 'upload', 'kyc', 'pan', 'gst', 'bank statement', 'pdf', 'image', 'file'],
    answer: 'To apply on Verdika, merchants must provide: 1. GST Registration Certificate (.pdf/.png), 2. Company/Signatory PAN Card (.pdf/.png, minimum 600px width), and 3. Bank Statement covering the last 6 months (.pdf). Merchants also need to provide valid bank settlement details including Account Holder Name, Account Number, and verified IFSC code.'
  },
  {
    keywords: ['adversarial', 'stress test', 'tamper', 'manipulat', 'gaming', 'fraud', 'integrity'],
    answer: 'The AdversarialAgent runs simulated stress tests on historical transaction velocity, revenue linearity, and refund spikes to detect synthetic data manipulation or timeline tampering before any loan is approved.'
  },
  {
    keywords: ['risk score', 'scoring', 'how it works', 'pipeline', 'agents', 'models', 'risk agent'],
    answer: 'Verdika\'s risk scoring is computed by the RiskAgent, which analyzes transaction velocity, refund ratios, and revenue stability against category benchmarks to calculate a 0-100% risk score and confidence interval. This output is combined with KYC document quality checks and AdversarialAgent integrity audits by the DecisionRouter to reach a final underwriting verdict.'
  },
  {
    keywords: ['approval', 'time', 'how long', 'fast', 'duration', 'tat'],
    answer: 'Verdika\'s autonomous multi-agent pipeline evaluates clean applications in under 3 seconds! If an application triggers manual review due to missing KYC documents or borderline risk, underwriters can review the decision traces and close it in their dashboard within a few business hours.'
  },
  {
    keywords: ['multi-tenant', 'company', 'institution', 'shareable', 'slug', 'public link'],
    answer: 'Finance companies can register a tenant account on Verdika to receive a dedicated, shareable application link (/apply/your-company). All merchant applications submitted through that link are strictly isolated and routed exclusively to that institution\'s private review queue.'
  },
  {
    keywords: ['pdf', 'report', 'download report', 'recommendation'],
    answer: 'Reviewers can click "Download Full Report (PDF)" on any application to generate a comprehensive 2-page report featuring an executive Reviewer Recommendation badge, KYC document quality checklists, quantitative risk breakdowns, and multi-agent audit trail logs.'
  }
];

const UNRELATED_PATTERNS = [
  'capital of', 'weather in', 'president of', 'write code for', 'recipe for', 'sing a song', 'tell me a joke', 'who is prime minister', 'history of france', 'history of rome', 'pythagorean'
];

/**
 * Generates chat response using Google Gemini API with detailed debug logging and fallback
 * @param {string} userMessage 
 * @param {Array} conversationHistory 
 * @returns {Promise<string>} Verdi AI response
 */
export async function generateVerdiChatResponse(userMessage, conversationHistory = []) {
  const cleanMessage = String(userMessage || '').trim();
  if (!cleanMessage) return "How can I help you with your loan application or underwriting evaluation?";

  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  // DEBUG LOGGING: Check if API key is present
  console.log('[VerdiChat DEBUG] Incoming User Message:', cleanMessage);
  console.log('[VerdiChat DEBUG] Gemini API Key present?', Boolean(geminiApiKey && geminiApiKey.length > 5));

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

      const requestPayload = {
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300
        }
      };

      console.log('[VerdiChat DEBUG] Outgoing Payload to Gemini:', JSON.stringify(requestPayload, null, 2));

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const responseStatus = res.status;
      const rawText = await res.text();
      console.log(`[VerdiChat DEBUG] Raw Gemini Response (Status ${responseStatus}):`, rawText);

      if (res.ok) {
        const data = JSON.parse(rawText);
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText && responseText.trim().length > 0) {
          console.log('[VerdiChat DEBUG] Successfully parsed Gemini text response:', responseText.trim());
          return responseText.trim();
        }
      } else {
        console.warn(`[VerdiChat DEBUG] Gemini API returned error status ${responseStatus}:`, rawText);
        logger.warn('[VerdiChat Gemini API Warning]:', rawText);
      }
    } catch (err) {
      console.error('[VerdiChat DEBUG] Gemini API Call Exception:', err);
      logger.warn('[VerdiChat Gemini API Call Exception]:', err.message);
    }
  }

  console.log('[VerdiChat DEBUG] Using specific contextual knowledge base fallback...');

  // Smart Contextual Fallback Engine (Strictly Scoped & Highly Specific)
  const lower = cleanMessage.toLowerCase();

  // 1. Check for off-topic queries
  const isOffTopic = UNRELATED_PATTERNS.some((pat) => lower.includes(pat));
  if (isOffTopic) {
    return "I'm here to help with Verdika and loan underwriting questions — is there something about the platform I can help with?";
  }

  // 2. Match knowledge base topics with scoring
  let bestMatch = null;
  let bestScore = 0;

  for (const item of VERDI_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        score += kw.length; // weight longer phrase matches higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  // 3. Platform overview response for broad questions
  if (lower.includes('work') || lower.includes('do') || lower.includes('platform') || lower.includes('about') || lower.includes('help') || lower.includes('how')) {
    return "Verdika is an autonomous loan underwriting platform where finance companies onboard merchants via custom links. When a merchant submits their business details, bank info, and KYC documents, our 5-agent AI pipeline (DataAgent, DocumentVerificationAgent, RiskAgent, AdversarialAgent, and DecisionRouter) instantly analyzes credit risk and generates actionable underwriting recommendations.";
  }

  return "I'm here to assist you with Verdika's loan underwriting platform, document requirements, and AI risk evaluations. Feel free to ask about our multi-agent pipeline, KYC verification, or underwriting reports!";
}
