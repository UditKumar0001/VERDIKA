import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from '../utils/logger.js';

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

  if (!apiKey) {
    logger.warn('[VerdiChat]: GEMINI_API_KEY not configured.');
    return "I'm having trouble responding right now, please try again.";
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

    // Limit history length to last 8 turns for performance
    if (validHistory.length > 8) {
      validHistory = validHistory.slice(-8);
      const subIdx = validHistory.findIndex((m) => m.role === 'user');
      if (subIdx !== -1) validHistory = validHistory.slice(subIdx);
    }

    // Try models in order: gemini-2.0-flash, gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-flash-latest, gemini-pro
    const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
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
      logger.error('[VerdiChat Gemini API Error]:', lastError);
    }
    return "I'm having trouble responding right now, please try again.";
  } catch (error) {
    logger.error('[VerdiChat Error]:', error);
    return "I'm having trouble responding right now, please try again.";
  }
}

/**
 * Backward compatibility export
 */
export async function generateVerdiChatResponse(userMessage, conversationHistory = [], context = null) {
  return getChatbotResponse(userMessage, conversationHistory, context);
}
