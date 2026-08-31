import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/companies/lookup/:slug
 * Public route to resolve a company's public branding and ID for public application links.
 * No authentication required.
 */
router.get('/lookup/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ error: 'Company slug is required.' });
    }

    const company = await Company.findBySlug(slug);
    if (!company) {
      return res.status(404).json({ error: 'Invalid or expired application link. Company not found.' });
    }

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        apply_link: `${appOrigin}/apply/${company.slug}`
      }
    });
  } catch (error) {
    logger.error(`[Company Lookup ${req.params.slug} Error]:`, error);
    return res.status(500).json({ error: 'Failed to look up company information.' });
  }
});

/**
 * GET /api/companies/my-company
 * Protected route: returns the logged-in finance company's details, application link, and stats.
 */
router.get('/my-company', requireAuth, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id || req.user.companyId;
    if (!userCompanyId) {
      return res.status(404).json({ error: 'No finance company associated with this account.' });
    }

    const company = await Company.findById(userCompanyId);
    if (!company) {
      return res.status(404).json({ error: 'Associated finance company not found.' });
    }

    // Compute Company-Specific Application Stats
    const companyApps = await Application.findAll({ company_id: userCompanyId });
    const total = companyApps.length;
    const pending_review = companyApps.filter((a) => a.status === 'pending_review').length;
    const approved = companyApps.filter((a) => {
      const dec = (a.reviewer_decision || a.decision || '').toLowerCase();
      return dec === 'approved' || dec === 'auto_approve';
    }).length;
    const rejected = companyApps.filter((a) => {
      const dec = (a.reviewer_decision || a.decision || '').toLowerCase();
      return dec === 'rejected' || dec === 'auto_reject';
    }).length;

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        apply_link: `${appOrigin}/apply/${company.slug}`
      },
      stats: {
        total,
        pending_review,
        approved,
        rejected
      }
    });
  } catch (error) {
    logger.error('[Get My Company Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve company details.' });
  }
});

export default router;
