/**
 * Chat API Client for Verdi AI Assistant
 * Communicates with backend proxy endpoint (/api/verdi-chat)
 */

import { API_BASE_URL, getAuthHeaders, handleApiError } from './config.js';

/**
 * Sends a chat message to Verdi AI backend
 * @param {string} message - Current user message
 * @param {Array} conversationHistory - Array of past messages [{ sender|role, text|content }]
 * @param {Object} context - Optional application context for tenant-isolated response
 * @returns {Promise<string>} AI assistant response text
 */
export async function sendVerdiMessage(message, conversationHistory = [], context = null) {
  try {
    const res = await fetch(`${API_BASE_URL}/verdi-chat`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({
        message,
        conversationHistory: (conversationHistory || []).map(m => ({
          role: (m.sender === 'user' || m.role === 'user') ? 'user' : 'model',
          text: m.text || m.content || '',
          content: m.text || m.content || ''
        })),
        context
      })
    });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error("Server returned an invalid response. Please try again.");
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Failed to communicate with Verdi.');
    }

    return data.reply || "I'm having trouble responding right now, please try again.";
  } catch (error) {
    const cleanMsg = handleApiError(error, "Sorry, I'm having trouble connecting right now. Please try again.");
    throw new Error(cleanMsg);
  }
}
