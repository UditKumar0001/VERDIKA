import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { agentPipeline } from '../services/agentPipeline.js';

const router = Router();

/**
 * Underwriting Routes
 * Handles loan application ingestion, multi-agent evaluation, and status retrieval.
 */

// GET /api/underwriting/applications
router.get('/applications', (req, res) => {
  // Placeholder application listing
  res.json({
    applications: [
      {
        id: 'app-101',
        applicantName: 'Apex Dynamics LLC',
        requestedAmount: 150000,
        riskScore: 78,
        status: 'PENDING_REVIEW'
      },
      {
        id: 'app-102',
        applicantName: 'BlueSky Logistics',
        requestedAmount: 500000,
        riskScore: 92,
        status: 'APPROVED'
      }
    ]
  });
});

// GET /api/underwriting/applications/:id
router.get('/applications/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    applicantName: 'Apex Dynamics LLC',
    requestedAmount: 150000,
    creditScore: 710,
    annualRevenue: 850000,
    riskScore: 78,
    status: 'PENDING_REVIEW',
    auditLogs: []
  });
});

// POST /api/underwriting/applications
router.post('/applications', async (req, res) => {
  const applicationData = req.body;
  const result = await agentPipeline.execute(applicationData);
  res.status(201).json({
    message: 'Application processed through agent pipeline',
    result
  });
});

export default router;
