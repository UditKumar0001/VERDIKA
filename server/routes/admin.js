import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { syntheticDataService } from '../services/syntheticDataService.js';

const router = Router();

/**
 * Admin Routes
 * Handles system configuration, synthetic data generation, and platform metrics.
 */

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
  res.json({
    activeAgents: ['DataAgent', 'RiskAgent', 'AdversarialAgent', 'DecisionRouter', 'ExplainerAgent'],
    totalEvaluations: 0,
    averageLatencyMs: 45
  });
});

// POST /api/admin/generate-data
router.post('/generate-data', async (req, res) => {
  const count = req.body.count || 20;
  const dataset = await syntheticDataService.generateDataset(count);
  res.json({
    message: `Generated ${dataset.length} synthetic applications`,
    dataset
  });
});

export default router;
