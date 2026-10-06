import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '../utils/logger.js';

/**
 * Smart contextual fallback when Gemini API key is unconfigured, rate-limited, or unavailable.
 */
function getContextualFallbackResponse(userMessage, context = null) {
  const msg = String(userMessage || '').toLowerCase();

  if (context && typeof context === 'object') {
    let details = `Your application (${context.applicationId || 'current'}) is currently "${context.status || 'under review'}".`;
    if (context.decision) details += ` Verdict: ${context.decision}.`;
    if (context.routingReason) details += ` Note: ${context.routingReason}.`;
    return details;
  }

  if (msg.includes('risk') || msg.includes('score')) {
    return "Verdi's AI evaluates credit risk using a multi-agent pipeline combining bank statement cashflow, GST checksum validation, and adversarial fraud detection. Scores range from 0.0 (lowest risk) to 1.0 (highest risk).";
  }
  if (msg.includes('document') || msg.includes('upload') || msg.includes('pan') || msg.includes('gst') || msg.includes('statement')) {
    return "To complete your application, please provide: 1) GST Registration Certificate, 2) Company/Proprietor PAN Card, and 3) 6-month PDF Bank Statement.";
  }
  if (msg.includes('approval') || msg.includes('time') || msg.includes('long') || msg.includes('fast')) {
    return "Automated AI underwriting approvals complete in under 30 seconds for healthy applications. Applications routed to human review are typically processed within 24 hours.";
  }
  if (msg.includes('status') || msg.includes('pending') || msg.includes('application')) {
    return "You can check your application status on your merchant dashboard or tracking link. Let me know if you need help with a specific Application ID.";
  }

  return "Hello! I am Verdi, your AI underwriting assistant. I can help answer questions about credit application requirements, risk scoring, bank verification, and approval timelines. What would you like to know?";
}

/**
 * Gets chatbot response using Google Generative AI SDK (@google/generative-ai)
 * Handles contextual prompts, tenant data isolation, and rate-limit / API fallback.
 * 
 * @param {string} userMessage - Raw user question
 * @param {Array} conversationHistory - Array of past messages [{ role|sender, text|content }]
 * @param {Object} context - Optional application context for tenant-isolated context injection
 * @returns {Promise<string>} AI assistant response text
 */
export async function getChatbotResponse(userMessage, conversationHistory = [], context = null) {
  const cleanMessage = String(userMessage || '').trim();
  if (!cleanMessage) {
    return "How can I help you with your loan application or underwriting evaluation?";
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  // System instruction baseline prompt
  let systemInstruction = "You are Verdika's support assistant. Answer questions about the platform's AI underwriting process, application status, and general lending/credit application help. Be concise, clear, and helpful.";

  // Context injection for specific application (strictly tenant-isolated)
  if (context && typeof context === 'object') {
    const appInfo = [];
    if (context.applicationId) appInfo.push(`Application ID: ${context.applicationId}`);
    if (context.businessName) appInfo.push(`Business Name: ${context.businessName}`);
    if (context.status) appInfo.push(`Current Status: ${context.status}`);
    if (context.decision) appInfo.push(`Underwriting Verdict: ${context.decision}`);
    if (context.riskScore !== undefined) appInfo.push(`Credit Risk Score: ${Math.round((context.riskScore || 0) * 100)}%`);
    if (context.routingReason) appInfo.push(`Routing Reason: ${context.routingReason}`);

    if (appInfo.length > 0) {
      systemInstruction += `\n\nCURRENT APPLICATION CONTEXT:\nThe user is asking about the following specific application (do not disclose details of any other tenant/application):\n${appInfo.join('\n')}`;
    }
  }

  // If no API key or invalid format, use smart contextual fallback
  if (!apiKey || apiKey.startsWith('<') || apiKey.length < 20) {
    logger.info('[VerdiChat]: Valid GEMINI_API_KEY not found in environment, using contextual fallback.');
    return getContextualFallbackResponse(cleanMessage, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Format conversation history for Gemini SDK
    const rawHistory = (conversationHistory || [])
      .filter((m) => (m.text || m.content) && (m.role || m.sender))
      .map((m) => {
        const role = (m.role === 'user' || m.sender === 'user') ? 'user' : 'model';
        const text = String(m.text || m.content || '').trim();
        return { role, parts: [{ text }] };
      });

    // Ensure Gemini chat history starts with 'user' role
    let validHistory = rawHistory;
    const firstUserIndex = validHistory.findIndex((m) => m.role === 'user');
    if (firstUserIndex !== -1) {
      validHistory = validHistory.slice(firstUserIndex);
    } else {
      validHistory = [];
    }

    if (validHistory.length > 8) {
      validHistory = validHistory.slice(-8);
      const subIdx = validHistory.findIndex((m) => m.role === 'user');
      if (subIdx !== -1) validHistory = validHistory.slice(subIdx);
    }

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-2.5-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction
        });

        const chat = model.startChat({
          history: validHistory
        });

        const result = await chat.sendMessage(cleanMessage);
        const responseText = result.response?.text ? result.response.text() : '';

        if (responseText && responseText.trim().length > 0) {
          return responseText.trim();
        }
      } catch (err) {
        lastError = err;
        const errStr = String(err.message || err || '').toLowerCase();
        
        // If 429 rate limit, return graceful user message
        if (errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota') || errStr.includes('rate limit')) {
          return "Rate limit reached or server busy. Please wait a moment and try again.";
        }

        // If 404 / model unavailable error, try next model in loop
        if (errStr.includes('404') || errStr.includes('not found') || errStr.includes('no longer available')) {
          logger.info(`[VerdiChat]: Model ${modelName} unavailable, falling back to next model...`);
          continue;
        }

        break;
      }
    }

    if (lastError) {
      logger.warn('[VerdiChat Gemini API Fallback]:', lastError.message);
    }
    return getContextualFallbackResponse(cleanMessage, context);
  } catch (error) {
    logger.warn('[VerdiChat Error]:', error.message);
    return getContextualFallbackResponse(cleanMessage, context);
  }
}

/**
 * Backward compatibility export
 */
export async function generateVerdiChatResponse(userMessage, conversationHistory = [], context = null) {
  return getChatbotResponse(userMessage, conversationHistory, context);
}
