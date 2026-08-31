import { Router } from 'express';
import { generateVerdiChatResponse } from '../services/verdiChatService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/verdi-chat
 * Public endpoint for Verdi AI Assistant.
 * Accepts { message: string, conversationHistory: Array } and returns { reply: string }.
 */
router.post('/verdi-chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const reply = await generateVerdiChatResponse(message, conversationHistory || []);

    return res.json({ reply });
  } catch (error) {
    logger.error('[Verdi Chat Route Error]:', error);
    return res.status(500).json({
      error: "Sorry, I'm having trouble connecting right now. Please try again."
    });
  }
});

export default router;
