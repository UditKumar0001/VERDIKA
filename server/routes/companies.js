import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { CompanyInvite } from '../models/CompanyInvite.js';
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

/**
 * GET /api/companies/team
 * Protected route (Admin only): returns team members and active/pending invites for the company.
 */
router.get('/team', requireAuth, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id || req.user.companyId;
    if (!userCompanyId) {
      return res.status(404).json({ error: 'No finance company associated with your account.' });
    }

    const members = await User.findByCompany(userCompanyId);
    const invites = await CompanyInvite.findByCompany(userCompanyId);

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    const formattedInvites = invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.isExpired() && inv.status === 'pending' ? 'expired' : inv.status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      invite_link: `${appOrigin}/invite/${inv.token}`
    }));

    return res.json({
      members: members.map((m) => m.sanitize()),
      invites: formattedInvites
    });
  } catch (error) {
    logger.error('[Get Company Team Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve team members.' });
  }
});

/**
 * POST /api/companies/invite
 * Protected route (Admin only): Creates an invite link and sends an invitation email.
 */
router.post('/invite', requireAuth, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id || req.user.companyId;
    if (!userCompanyId) {
      return res.status(403).json({ error: 'Only institution administrators can invite team members.' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'underwriter') {
      return res.status(403).json({ error: 'Forbidden: Admin privilege required to invite team members.' });
    }

    const { email, role = 'underwriter' } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Check if user is already an active member of this company
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.company_id === userCompanyId) {
      return res.status(409).json({ error: `An active account with ${email} already belongs to your team.` });
    }

    const invite = await CompanyInvite.create({
      company_id: userCompanyId,
      email,
      role: role === 'admin' ? 'admin' : 'underwriter',
      invited_by: req.user.id,
      hoursValid: 72
    });

    const appOrigin = req.headers.origin || 'http://localhost:5173';
    const inviteLink = `${appOrigin}/invite/${invite.token}`;

    logger.info(`[Team Invite] Admin ${req.user.email} invited ${email} to Company ID ${userCompanyId} [Link: ${inviteLink}]`);

    return res.status(201).json({
      message: `Invitation generated successfully for ${email}.`,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
        invite_link: inviteLink
      }
    });
  } catch (error) {
    logger.error('[Create Company Invite Error]:', error);
    return res.status(500).json({ error: 'Failed to generate invitation link.' });
  }
});

/**
 * DELETE /api/companies/invite/:id
 * Protected route (Admin only): Revokes a pending invite.
 */
router.delete('/invite/:id', requireAuth, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id || req.user.companyId;
    const { id } = req.params;

    await CompanyInvite.revoke(id, userCompanyId);

    return res.json({ message: 'Invitation revoked successfully.' });
  } catch (error) {
    logger.error(`[Revoke Invite ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to revoke invitation.' });
  }
});

export default router;

