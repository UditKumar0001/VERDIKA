/**
 * Chat API Client for Verdi AI Assistant
 */

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`;

/**
 * Sends a chat message to Verdi AI backend
 * @param {string} message - Current user message
 * @param {Array} conversationHistory - Array of past messages [{ sender, text }]
 * @returns {Promise<string>} AI assistant response text
 */
export async function sendVerdiMessage(message, conversationHistory = []) {
  try {
    const res = await fetch(`${API_BASE_URL}/verdi-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.map(m => ({
          sender: m.sender,
          text: m.text
        }))
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to communicate with Verdi.');
    }

    return data.reply;
  } catch (error) {
    throw new Error(error.message || "Sorry, I'm having trouble connecting right now. Please try again.");
  }
}
