import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { Application } from '../models/Application.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Notification } from '../models/Notification.js';
import { agentPipeline } from '../services/agentPipeline.js';
import { validateBankAccountRazorpay } from '../services/razorpayBankValidationService.js';
import { sendDecisionNotification } from '../services/notificationService.js';
import { validateApplicationInput } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/underwriting/validate-bank-account
 * Penny-drop bank account validation via Razorpay Fund Account Validation API
 */
router.post('/validate-bank-account', async (req, res) => {
  try {
    const { account_number, ifsc, account_holder } = req.body || {};
    const result = await validateBankAccountRazorpay({ account_number, ifsc, account_holder });
    return res.json(result);
  } catch (error) {
    logger.error('[Validate Bank Account Route Error]:', error);
    return res.status(500).json({
      status: 'Failed',
      bankVerificationStatus: 'Failed',
      error: error.message || 'Bank validation failed.'
    });
  }
});

/**
 * GET /api/underwriting/applications
 * Returns list of underwriting applications with optional status filtering and search.
 * Multi-tenant data isolation: strictly scoped to req.user.company_id if associated with a finance company.
 * Restricted to roles: underwriter, admin, risk_officer.
 */
router.get('/applications', requireAuth, async (req, res) => {
  try {
    if (!req.user || !['underwriter', 'admin', 'risk_officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Underwriter or Admin access required.' });
    }

    const { status, search } = req.query;
    const userCompanyId = req.user.company_id || req.user.companyId;

    // Filter by company_id if user belongs to a specific finance company
    const filters = { status, search };
    if (userCompanyId && req.user.role !== 'admin') {
      filters.company_id = userCompanyId;
    }

    const applications = await Application.findAll(filters);
    return res.json({ applications, total: applications.length });
  } catch (error) {
    logger.error('[Underwriting Get Applications Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

/**
 * GET /api/underwriting/applications/:id
 * Fetches an individual application with its complete audit trail.
 * Enforces company-level tenant isolation.
 * Restricted to roles: underwriter, admin, risk_officer.
 */
router.get('/applications/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user || !['underwriter', 'admin', 'risk_officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Underwriter or Admin access required.' });
    }

    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const userCompanyId = req.user.company_id || req.user.companyId;
    if (userCompanyId && application.company_id && application.company_id !== userCompanyId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Application belongs to another company.' });
    }

    const auditLogs = await AuditLog.findByApplicationId(id);

    let reviewer_name = null;
    if (application.reviewer_id) {
      const reviewerUser = await User.findById(application.reviewer_id);
      if (reviewerUser) {
        reviewer_name = reviewerUser.name;
      }
    }

    let company_name = null;
    if (application.company_id) {
      const comp = await Company.findById(application.company_id);
      if (comp) company_name = comp.name;
    }

    const appResponse = JSON.parse(JSON.stringify(application));
    appResponse.reviewer_name = reviewer_name;
    appResponse.company_name = company_name;

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
 * POST /api/underwriting/apply-public/:companySlug
 * Public endpoint for merchants applying through a finance company's specific public shareable link.
 * No user login required. Looks up company by slug and attaches company_id to the application.
 */
router.post('/apply-public/:companySlug', async (req, res) => {
  try {
    const { companySlug } = req.params;
    if (!companySlug) {
      return res.status(400).json({ error: 'Company slug is required in URL.' });
    }

    const company = await Company.findBySlug(companySlug);
    if (!company) {
      return res.status(404).json({ error: 'Invalid or expired application link. Company not found.' });
    }

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request payload.' });
    }

    // Create Application tagged with company.id
    const appData = {
      company_id: company.id,
      user_id: null,
      merchant_data: req.body,
      status: 'pending_review'
    };
    const createdApp = await Application.create(appData);

    // Run Multi-Agent Evaluation Pipeline
    const pipelineResult = await agentPipeline.execute(createdApp.merchant_data);

    // Persist Audit Logs
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

    const status = (pipelineResult.decision === 'auto_approve' || pipelineResult.decision === 'auto_reject') ? 'closed' : 'pending_review';

    const enrichedMerchantData = {
      ...createdApp.merchant_data,
      data_source: pipelineResult.data_source || 'Synthetic/Sample Data',
      data_source_flag: pipelineResult.data_source_flag || 'SYNTHETIC_FALLBACK',
      extraction_notes: pipelineResult.extraction_notes || '',
      transaction_history: pipelineResult.transaction_history || createdApp.merchant_data.transaction_history
    };

    const evaluation = {
      merchant_data: enrichedMerchantData,
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

    logger.info(`[Public Application Ingested] ID: ${updatedApp.id} for Company: ${company.name} (${company.slug}) [Data Source: ${pipelineResult.data_source}]`);

    return res.status(201).json({
      applicationId: updatedApp.id,
      decision: updatedApp.decision,
      applicantMessage: updatedApp.applicant_message,
      data_source: pipelineResult.data_source,
      extraction_notes: pipelineResult.extraction_notes,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      }
    });
  } catch (error) {
    logger.error(`[Apply Public ${req.params.companySlug} Error]:`, error);
    return res.status(500).json({ error: 'Failed to process application.' });
  }
});

/**
 * POST /api/underwriting/apply
 * Authenticated merchant loan application submission.
 */
router.post('/apply', requireAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request payload' });
    }

    let targetCompanyId = req.user.company_id || null;
    if (req.body.company_slug) {
      const comp = await Company.findBySlug(req.body.company_slug);
      if (comp) targetCompanyId = comp.id;
    }

    const appData = {
      company_id: targetCompanyId,
      user_id: req.user.id,
      merchant_data: req.body,
      status: 'pending_review'
    };
    const createdApp = await Application.create(appData);

    const pipelineResult = await agentPipeline.execute(createdApp.merchant_data);

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

    const status = (pipelineResult.decision === 'auto_approve' || pipelineResult.decision === 'auto_reject') ? 'closed' : 'pending_review';

    const enrichedMerchantData = {
      ...createdApp.merchant_data,
      data_source: pipelineResult.data_source || 'Synthetic/Sample Data',
      data_source_flag: pipelineResult.data_source_flag || 'SYNTHETIC_FALLBACK',
      extraction_notes: pipelineResult.extraction_notes || '',
      transaction_history: pipelineResult.transaction_history || createdApp.merchant_data.transaction_history
    };

    const evaluation = {
      merchant_data: enrichedMerchantData,
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

    return res.status(201).json({
      applicationId: updatedApp.id,
      decision: updatedApp.decision,
      applicantMessage: updatedApp.applicant_message,
      data_source: pipelineResult.data_source,
      extraction_notes: pipelineResult.extraction_notes
    });
  } catch (error) {
    logger.error('[Underwriting Apply Error]:', error);
    return res.status(500).json({ error: 'Failed to process application.' });
  }
});

/**
 * GET /api/underwriting/my-applications
 * Returns a merchant's own application history (trimmed for applicant view).
 */
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const rawApps = await Application.findAll({ user_id: userId, status });

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
 * POST /api/underwriting/applications/:id/review
 * Submits human underwriter decision. Enforces tenant isolation.
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

    const userCompanyId = req.user.company_id || req.user.companyId;
    if (userCompanyId && application.company_id && application.company_id !== userCompanyId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Application belongs to another company.' });
    }

    // Critical Security Check: Underwriters cannot review their own application
    const merchantEmail = application.merchant_data?.applicant_email || application.merchant_data?.email || '';
    const isSelfApplication = (merchantEmail && merchantEmail.toLowerCase() === req.user.email.toLowerCase()) || (application.user_id && application.user_id === req.user.id);
    if (isSelfApplication && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Anti-Collusion Policy: You cannot review or approve your own loan application.'
      });
    }

    // 1. Update Application status to 'closed', setting reviewer_id and reviewer_decision
    const updatedApp = await Application.updateStatus(id, 'closed', req.user.id, normalizedDecision);

    // 2. Append AuditLog entry
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

    // 3. Trigger automatic merchant notification email & audit record
    let notificationResult = null;
    try {
      notificationResult = await sendDecisionNotification({
        application: updatedApp,
        decision: normalizedDecision,
        customNotes: notes || ''
      });
    } catch (notifErr) {
      logger.warn(`[Notification Warning] Failed to dispatch decision email for ${id}:`, notifErr.message);
    }

    const auditLogs = await AuditLog.findByApplicationId(id);

    return res.json({
      message: `Application reviewed successfully as ${normalizedDecision}.`,
      application: updatedApp,
      auditLogs,
      notification: notificationResult?.notification || null
    });
  } catch (error) {
    logger.error(`[Underwriting Review Application ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to submit review decision.' });
  }
});

/**
 * GET /api/underwriting/status/:token
 * Public merchant status tracking endpoint (no authentication required).
 * Accessible via unique application token or application ID.
 */
router.get('/status/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Application token is required.' });
    }

    const application = await Application.findByIdOrToken(token);
    if (!application) {
      return res.status(404).json({ error: 'Application not found with this tracking link.' });
    }

    const merchantData = application.merchant_data || {};
    const bankDetails = merchantData.bank_details || {};

    // Get company details if tenant-linked
    let companyName = 'Verdika Capital';
    if (application.company_id) {
      const company = await Company.findById(application.company_id);
      if (company) companyName = company.name;
    }

    // Public sanitized representation
    const statusPayload = {
      applicationId: application.id,
      businessName: merchantData.business_name || 'Business Applicant',
      businessCategory: merchantData.business_category || 'General',
      gstin: merchantData.gstin || 'N/A',
      companyName,
      status: application.status,
      decision: application.reviewer_decision || application.decision || 'UNDER_REVIEW',
      applicantMessage: application.applicant_message,
      createdAt: application.created_at,
      updatedAt: application.updated_at,
      dataSource: merchantData.data_source || 'Synthetic/Sample Data',
      bankDetails: {
        accountHolder: bankDetails.account_holder,
        maskedAccountNumber: bankDetails.masked_account_number || (bankDetails.account_number ? 'XXXXXX' + String(bankDetails.account_number).slice(-4) : 'N/A'),
        ifsc: bankDetails.ifsc,
        bankName: bankDetails.bank_name,
        verificationStatus: bankDetails.bankVerificationStatus || (bankDetails.bank_verification?.status) || 'Verified'
      }
    };

    return res.json(statusPayload);
  } catch (error) {
    logger.error(`[Underwriting Public Status ${req.params.token} Error]:`, error);
    return res.status(500).json({ error: 'Failed to retrieve application status.' });
  }
});

/**
 * GET /api/underwriting/applications/:id/notifications
 * Returns all audit-logged email notifications for an application (reviewer view).
 */
router.get('/applications/:id/notifications', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const notifications = await Notification.findByApplicationId(id);
    return res.json({ notifications, total: notifications.length });
  } catch (error) {
    logger.error(`[Underwriting Notifications ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

export default router;
