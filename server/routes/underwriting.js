import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { agentPipeline } from '../services/agentPipeline.js';
import { validateApplicationInput } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/underwriting/applications
 * Returns list of underwriting applications with optional status filtering and search.
 * Restricted to roles: underwriter, admin.
 */
router.get('/applications', requireAuth, async (req, res) => {
  try {
    if (!req.user || !['underwriter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Underwriter or Admin access required.' });
    }

    const { status, search } = req.query;
    const applications = await Application.findAll({ status, search });
    return res.json({ applications, total: applications.length });
  } catch (error) {
    logger.error('[Underwriting Get Applications Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

/**
 * GET /api/underwriting/applications/:id
 * Fetches an individual application with its complete audit trail.
 * Restricted to roles: underwriter, admin.
 */
router.get('/applications/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user || !['underwriter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Underwriter or Admin access required.' });
    }

    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const auditLogs = await AuditLog.findByApplicationId(id);

    let reviewer_name = null;
    if (application.reviewer_id) {
      const reviewerUser = await User.findById(application.reviewer_id);
      if (reviewerUser) {
        reviewer_name = reviewerUser.name;
      }
    }

    const appResponse = JSON.parse(JSON.stringify(application));
    appResponse.reviewer_name = reviewer_name;

    return res.json({
      application: appResponse,
      auditLogs
    });
  } catch (error) {
    logger.error(`[Underwriting Get Application ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to retrieve application details.' });
  }
});

/**
 * POST /api/underwriting/applications
 * Ingests a new loan application, executes multi-agent pipeline, and persists audit logs.
 */
router.post('/applications', requireAuth, async (req, res) => {
  try {
    const { isValid, errors } = validateApplicationInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const appData = {
      applicantName: req.body.applicantName,
      businessType: req.body.businessType || 'LLC',
      requestedAmount: Number(req.body.requestedAmount),
      creditScore: Number(req.body.creditScore),
      annualRevenue: Number(req.body.annualRevenue),
      debtToIncome: req.body.debtToIncome !== undefined ? Number(req.body.debtToIncome) : 0.25,
      yearsInBusiness: req.body.yearsInBusiness !== undefined ? Number(req.body.yearsInBusiness) : 3,
      status: 'PENDING_REVIEW'
    };

    // 1. Initial Application Record Creation
    const createdApp = await Application.create(appData);

    // 2. Execute Multi-Agent Evaluation Pipeline
    const pipelineResult = await agentPipeline.execute(createdApp);

    // 3. Persist Agent Audit Logs
    if (pipelineResult.auditLogs && Array.isArray(pipelineResult.auditLogs)) {
      for (const log of pipelineResult.auditLogs) {
        await AuditLog.create({
          applicationId: createdApp.id,
          agentName: log.agentName,
          inputSnapshot: log.inputSnapshot,
          outputSnapshot: log.outputSnapshot,
          confidenceScore: log.confidenceScore,
          executionTimeMs: log.executionTimeMs,
          summary: log.summary
        });
      }
    }

    // 4. Update Application Record with Verdict
    const updatedApp = await Application.updateEvaluation(createdApp.id, {
      riskScore: pipelineResult.riskScore,
      confidenceScore: pipelineResult.confidenceScore,
      status: pipelineResult.status,
      decisionDetails: pipelineResult.decisionDetails
    });

    const auditLogs = await AuditLog.findByApplicationId(createdApp.id);

    return res.status(201).json({
      message: 'Application evaluated successfully through multi-agent pipeline.',
      application: updatedApp,
      auditLogs
    });
  } catch (error) {
    logger.error('[Underwriting Submit Application Error]:', error);
    return res.status(500).json({ error: 'Failed to process application.' });
  }
});

// New route: POST /api/underwriting/apply
router.post('/apply', requireAuth, async (req, res) => {
  try {
    // Validate payload
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    // Minimal application record (merchant_data stores raw payload)
    const appData = {
      user_id: req.user.id,
      merchant_data: req.body,
      status: 'pending_review'
    };
    const createdApp = await Application.create(appData);

    // Run full pipeline
    const pipelineResult = await agentPipeline.execute(createdApp.merchant_data);
    // Optional: log any missing fields but continue processing
    const requiredFields = ['features','risk_result','adversarial_result','decision','routing_reason','applicant_message','underwriter_summary'];
    const missing = requiredFields.filter(f => pipelineResult[f] === undefined || pipelineResult[f] === null);
    if (missing.length) {
      logger.warn('Pipeline result missing fields:', missing);
    }

    // Persist audit logs (system actor)
    if (pipelineResult.auditLogs && Array.isArray(pipelineResult.auditLogs)) {
      for (const log of pipelineResult.auditLogs) {
        await AuditLog.create({
          applicationId: createdApp.id,
          agentName: log.agentName,
          inputSnapshot: log.inputSnapshot,
          outputSnapshot: log.outputSnapshot,
          confidenceScore: log.confidenceScore,
          executionTimeMs: log.executionTimeMs,
          summary: log.summary,
          actor: 'system'
        });
      }
    }

    // Determine final status based on decision: 'closed' for auto_approve / auto_reject, 'pending_review' for route_to_human
    const status = (pipelineResult.decision === 'auto_approve' || pipelineResult.decision === 'auto_reject') ? 'closed' : 'pending_review';

    // Update application with pipeline outputs and final status
    const evaluation = {
      merchant_data: createdApp.merchant_data,
      features: pipelineResult.features,
      risk_result: pipelineResult.risk_result,
      adversarial_result: pipelineResult.adversarial_result,
      decision: pipelineResult.decision,
      routing_reason: pipelineResult.routing_reason ?? pipelineResult.routingReason ?? null,
      applicant_message: pipelineResult.applicant_message ?? pipelineResult.applicantMessage ?? null,
      underwriter_summary: pipelineResult.underwriter_summary ?? pipelineResult.underwriterSummary ?? null,
      status
    };
    const updatedApp = await Application.updateEvaluation(createdApp.id, evaluation);

    // Return only required fields
    return res.status(201).json({
      applicationId: updatedApp.id,
      decision: updatedApp.decision,
      applicantMessage: updatedApp.applicant_message
    });
  } catch (error) {
    logger.error('[Underwriting Apply Error]:', error);
    return res.status(500).json({ error: 'Failed to process application.' });
  }
});

/**
 * GET /api/underwriting/my-applications
 * Returns a merchant's own application history (trimmed for applicant view).
 * Protected route: any authenticated user can call this.
 * Security boundary: Strictly filtered by req.user.id.
 */
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const rawApps = await Application.findAll({ user_id: userId, status });

    // Format response payload for applicant view (trimmed, no internal risk/adv results or summaries)
    const applications = rawApps.map(app => {
      const merchantData = app.merchant_data || {};
      const business_name = merchantData.business_name || merchantData.businessName || null;
      return {
        id: app.id,
        business_name,
        decision: app.decision,
        status: app.status,
        applicant_message: app.applicant_message,
        created_at: app.created_at
      };
    });

    return res.json({ applications, total: applications.length });
  } catch (error) {
    logger.error('[Underwriting Get My Applications Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve application history.' });
  }
});

/**
 * PATCH /api/underwriting/applications/:id/status
 * Allows underwriters to manually override or confirm decision status.
 */
router.patch('/applications/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'PENDING_REVIEW'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const updatedDecisionDetails = {
      ...application.decisionDetails,
      manualOverride: {
        by: req.user.email,
        at: new Date().toISOString(),
        previousStatus: application.status,
        newStatus: status,
        note: note || 'Manual status transition by underwriter.'
      }
    };

    const updatedApp = await Application.updateStatus(id, status, updatedDecisionDetails);

    // Record audit log entry for manual override
    await AuditLog.create({
      applicationId: id,
      agentName: 'HumanUnderwriter',
      summary: `Manual override to ${status} by ${req.user.email}. Note: ${note || 'No note provided'}`,
      confidenceScore: 1.0,
      executionTimeMs: 0
    });

    const auditLogs = await AuditLog.findByApplicationId(id);

    return res.json({
      message: `Application status updated to ${status}`,
      application: updatedApp,
      auditLogs
    });
  } catch (error) {
    logger.error(`[Underwriting Update Status ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
});

/**
 * POST /api/underwriting/applications/:id/review
 * Submits human underwriter decision, updates application status to 'closed',
 * sets reviewer_id and reviewer_decision, and appends a human AuditLog trace.
 * Restricted to roles: underwriter, admin.
 */
router.post('/applications/:id/review', requireAuth, async (req, res) => {
  try {
    if (!req.user || !['underwriter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Underwriter or Admin access required.' });
    }

    const { id } = req.params;
    const { decision, notes } = req.body || {};

    const normalizedDecision = typeof decision === 'string' ? decision.toLowerCase() : '';
    if (!['approved', 'rejected'].includes(normalizedDecision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be "approved" or "rejected".' });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    // 1. Update Application status to 'closed', setting reviewer_id and reviewer_decision
    const updatedApp = await Application.updateStatus(id, 'closed', req.user.id, normalizedDecision);

    // 2. Append NEW AuditLog entry with actor set to reviewer's user ID (not 'system')
    const summary = `Human review decision: ${normalizedDecision.toUpperCase()}${notes ? `. Notes: ${notes}` : ''}`;
    await AuditLog.create({
      applicationId: id,
      agentName: 'HumanReviewer',
      actor: req.user.id,
      inputSnapshot: { reviewerId: req.user.id, decision: normalizedDecision, notes: notes || '' },
      outputSnapshot: { status: 'closed', reviewerDecision: normalizedDecision },
      confidenceScore: 1.0,
      executionTimeMs: 0,
      summary
    });

    const auditLogs = await AuditLog.findByApplicationId(id);

    return res.json({
      message: `Application reviewed successfully as ${normalizedDecision}.`,
      application: updatedApp,
      auditLogs
    });
  } catch (error) {
    logger.error(`[Underwriting Review Application ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to submit review decision.' });
  }
});

export default router;
