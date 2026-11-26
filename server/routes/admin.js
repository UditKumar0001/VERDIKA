import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { syntheticDataService } from '../services/syntheticDataService.js';
import { db } from '../config/db.js';
import { Application } from '../models/Application.js';
import { logger } from '../utils/logger.js';
import { getHashedLedgerPath } from '../services/documentHashLedgerService.js';
import fs from 'fs';

const router = Router();

/**
 * Admin Routes
 * Handles system configuration, synthetic data generation, and platform metrics.
 */

// GET /api/admin/metrics
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const totalAppsRow = await db.get('SELECT COUNT(*) as count FROM applications');
    const statusRows = await db.all('SELECT status, COUNT(*) as count FROM applications GROUP BY status');
    const auditRow = await db.get('SELECT COUNT(*) as count, AVG(execution_time_ms) as avgLatency FROM audit_logs');

    const statusCounts = {
      APPROVED: 0,
      REJECTED: 0,
      MANUAL_REVIEW: 0,
      PENDING_REVIEW: 0
    };

    statusRows.forEach((r) => {
      statusCounts[r.status] = r.count;
    });

    res.json({
      activeAgents: ['DataAgent', 'RiskAgent', 'AdversarialAgent', 'DecisionRouter', 'ExplainerAgent'],
      totalApplications: totalAppsRow?.count || 0,
      averageRiskScore: totalAppsRow?.avgRisk ? Math.round(totalAppsRow.avgRisk) : 0,
      statusBreakdown: statusCounts,
      totalEvaluations: auditRow?.count || 0,
      averageLatencyMs: auditRow?.avgLatency ? Math.round(auditRow.avgLatency) : 45
    });
  } catch (error) {
    logger.error('[Admin Metrics Error]:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics.' });
  }
});

// POST /api/admin/generate-data
router.post('/generate-data', requireAuth, async (req, res) => {
  try {
    const count = Math.min(Number(req.body.count) || 10, 50);
    const dataset = await syntheticDataService.generateDataset(count);

    // Ingest into SQLite applications table
    for (const app of dataset) {
      await Application.create({
        applicantName: app.applicantName,
        businessType: 'LLC',
        requestedAmount: app.requestedAmount,
        creditScore: app.creditScore,
        annualRevenue: app.annualRevenue,
        debtToIncome: 0.3,
        yearsInBusiness: 4,
        status: 'PENDING_REVIEW'
      });
    }

    res.json({
      message: `Generated and ingested ${dataset.length} synthetic applications into queue.`,
      dataset
    });
  } catch (error) {
    logger.error('[Admin Generate Data Error]:', error);
    res.status(500).json({ error: 'Failed to generate synthetic data.' });
  }
});

/**
 * GET /api/admin/hashed-documents-export
 * Downloads the irreversible SHA-256 hashed document ledger as an Excel-compatible CSV.
 */
router.get('/hashed-documents-export', (req, res) => {
  const ledgerPath = getHashedLedgerPath();
  if (!fs.existsSync(ledgerPath)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="superadmin_hashed_documents.csv"');
    return res.send('timestamp,application_id,company_id,gstin_sha256,pan_sha256,bank_sha256,document_sha256\n');
  }
  return res.download(ledgerPath, 'superadmin_hashed_documents.csv');
});

export default router;
