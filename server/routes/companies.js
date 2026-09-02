import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { Company } from '../models/Company.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { CompanyInvite } from '../models/CompanyInvite.js';
import { sendCompanyAdminWelcomeEmail, sendSuperAdminInviteEmail } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/companies
 * Public route to list all active finance companies/tenants registered on the platform.
 * Excludes deactivated/removed companies.
 * No authentication required.
 */
router.get('/', async (req, res) => {
  try {
    const companies = await Company.findAll({ activeOnly: true });
    const appOrigin = req.headers.origin || 'http://localhost:5173';

    const formatted = companies.map((comp) => {
      const isDefault = comp.slug === 'verdika-capital';
      return {
        id: comp.id,
        name: comp.name,
        slug: comp.slug,
        email: comp.email,
        status: comp.status,
        default_interest_rate: comp.default_interest_rate != null ? Number(comp.default_interest_rate) : 14.0,
        created_at: comp.created_at,
        apply_link: `${appOrigin}/apply/${comp.slug}`,
        badge: isDefault ? 'Core Institutional Partner' : 'Private Lending Tenant',
        tagline: isDefault
          ? 'Primary algorithmic credit facility & commercial merchant underwriter.'
          : 'Verified institutional lending partner providing automated commercial credit underwriting.'
      };
    });

    return res.json({
      companies: formatted,
      total: formatted.length
    });
  } catch (error) {
    logger.error('[List Public Companies Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve finance companies.' });
  }
});

/**
 * GET /api/companies/lookup/:slug
 * Public route to resolve a company's public branding and ID for public application links.
 * Checks for company active status.
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

    if (company.status === 'removed') {
      return res.status(403).json({
        error: 'This application link is no longer active.',
        inactive: true
      });
    }

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        default_interest_rate: company.default_interest_rate != null ? Number(company.default_interest_rate) : 14.0,
        apply_link: `${appOrigin}/apply/${company.slug}`
      }
    });
  } catch (error) {
    logger.error(`[Company Lookup ${req.params.slug} Error]:`, error);
    return res.status(500).json({ error: 'Failed to look up company information.' });
  }
});

/**
 * ============================================================================
 * SUPER ADMIN PLATFORM ROUTES
 * ============================================================================
 */

/**
 * GET /api/companies/admin/all
 * Protected (Super Admin only): Returns full list of all platform finance companies
 * with admin contacts, underwriter counts, application volume, and active/removed status.
 */
router.get('/admin/all', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const companies = await Company.findAllWithStats();
    const appOrigin = req.headers.origin || 'http://localhost:5173';

    const formatted = companies.map((c) => ({
      ...c,
      apply_link: `${appOrigin}/apply/${c.slug}`
    }));

    return res.json({
      companies: formatted,
      total: formatted.length
    });
  } catch (error) {
    logger.error('[Super Admin Get All Companies Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve platform companies.' });
  }
});

/**
 * POST /api/companies/admin/:id/deactivate
 * Protected (Super Admin only): Soft-deletes / deactivates a finance company.
 */
router.post('/admin/:id/deactivate', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Finance company not found.' });
    }

    const updated = await Company.setStatus(id, 'removed', req.user);
    logger.info(`[Super Admin] Deactivated company "${company.name}" (ID: ${id}) by Super Admin ${req.user.email}`);

    return res.json({
      message: `Finance company "${company.name}" has been deactivated successfully.`,
      company: updated
    });
  } catch (error) {
    logger.error(`[Super Admin Deactivate Company ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to deactivate company.' });
  }
});

/**
 * POST /api/companies/admin/:id/reactivate
 * Protected (Super Admin only): Reactivates a previously removed finance company.
 */
router.post('/admin/:id/reactivate', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Finance company not found.' });
    }

    const updated = await Company.setStatus(id, 'active', req.user);
    logger.info(`[Super Admin] Reactivated company "${company.name}" (ID: ${id}) by Super Admin ${req.user.email}`);

    return res.json({
      message: `Finance company "${company.name}" has been reactivated successfully.`,
      company: updated
    });
  } catch (error) {
    logger.error(`[Super Admin Reactivate Company ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to reactivate company.' });
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

    if (company.status === 'removed' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        error: 'This account has been deactivated. Contact Verdika support for details.'
      });
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
        status: company.status,
        default_interest_rate: company.default_interest_rate != null ? Number(company.default_interest_rate) : 14.0,
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
 * PUT /api/companies/my-company/settings
 * Protected route (Admin or Super Admin only): Updates company configuration like default interest rate.
 */
router.put('/my-company/settings', requireAuth, async (req, res) => {
  try {
    const userCompanyId = req.user.company_id || req.user.companyId;
    if (!userCompanyId) {
      return res.status(404).json({ error: 'No finance company associated with your account.' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Admin privilege required to update company settings.' });
    }

    const { default_interest_rate, name } = req.body;

    if (default_interest_rate !== undefined) {
      const numRate = Number(default_interest_rate);
      if (isNaN(numRate) || numRate <= 0 || numRate > 60) {
        return res.status(400).json({ error: 'Default interest rate must be a valid percentage between 1% and 60%.' });
      }
    }

    const updated = await Company.updateSettings(userCompanyId, {
      default_interest_rate: default_interest_rate !== undefined ? Number(default_interest_rate) : undefined,
      name: name ? String(name).trim() : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: 'Company not found or failed to update.' });
    }

    logger.info(`[Company Settings] Admin ${req.user.email} updated settings for "${updated.name}" (ID: ${userCompanyId}) - Interest Rate: ${updated.default_interest_rate}% p.a.`);

    const appOrigin = req.headers.origin || 'http://localhost:5173';

    return res.json({
      message: 'Company settings updated successfully.',
      company: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        email: updated.email,
        status: updated.status,
        default_interest_rate: updated.default_interest_rate != null ? Number(updated.default_interest_rate) : 14.0,
        apply_link: `${appOrigin}/apply/${updated.slug}`
      }
    });
  } catch (error) {
    logger.error('[Update Company Settings Error]:', error);
    return res.status(500).json({ error: 'Failed to update company settings.' });
  }
});

// Alias for convenience
router.put('/settings', requireAuth, async (req, res) => {
  req.url = '/my-company/settings';
  return router.handle(req, res);
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
      return res.status(403).json({ error: 'Only company administrators can invite team members.' });
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
 * POST /api/companies/admin/create-company
 * Protected route (Super Admin only):
 * Manually provisions a new Finance Company tenancy along with its primary Administrator account.
 */
router.post('/admin/create-company', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      company_name,
      admin_name,
      admin_email,
      password_mode = 'manual',
      password: rawPassword
    } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ error: 'Company Name is required.' });
    }

    if (!admin_name || !admin_name.trim()) {
      return res.status(400).json({ error: 'Admin Full Name is required.' });
    }

    if (!admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email.trim())) {
      return res.status(400).json({ error: 'A valid Admin Work Email is required.' });
    }

    let finalPassword = rawPassword;
    if (password_mode === 'auto' || !finalPassword) {
      // Auto-generate strong 12-char alphanumeric password
      finalPassword = 'Vrdk$' + crypto.randomBytes(4).toString('hex').toUpperCase() + Math.floor(10 + Math.random() * 90);
    } else if (finalPassword.length < 8) {
      return res.status(400).json({ error: 'Admin password must be at least 8 characters long.' });
    }

    // Verify email uniqueness across all users
    const existingUser = await User.findByEmail(admin_email);
    if (existingUser) {
      return res.status(409).json({ error: `An account with email "${admin_email}" already exists.` });
    }

    // Generate unique slug and create company
    const slug = await Company.generateSlug(company_name);
    const company = await Company.create({
      name: company_name.trim(),
      slug,
      email: admin_email.trim().toLowerCase()
    });

    // Hash password & create admin user
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

    const adminUser = await User.create({
      name: admin_name.trim(),
      email: admin_email.trim().toLowerCase(),
      passwordHash,
      role: 'admin',
      company_id: company.id
    });

    const appOrigin = req.headers.origin || 'http://localhost:5173';
    const loginUrl = `${appOrigin}/login`;
    const applyUrl = `${appOrigin}/apply/${company.slug}`;

    // Dispatch welcome email with credentials
    await sendCompanyAdminWelcomeEmail({
      adminEmail: adminUser.email,
      adminName: adminUser.name,
      companyName: company.name,
      password: finalPassword,
      loginUrl,
      applyUrl
    });

    logger.info(`[Super Admin] Created Company "${company.name}" (Slug: ${company.slug}) with Admin ${adminUser.email}`);

    return res.status(201).json({
      message: `Finance company "${company.name}" and administrator account created successfully.`,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        status: company.status,
        apply_url: applyUrl
      },
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      },
      credentials: {
        email: adminUser.email,
        password: finalPassword,
        login_url: loginUrl
      }
    });
  } catch (error) {
    logger.error('[Super Admin Create Company Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create finance company and admin account.' });
  }
});

/**
 * GET /api/companies/admin/super-admins
 * Protected route (Super Admin only): Lists all active Super Admins and pending invitations.
 */
router.get('/admin/super-admins', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const superAdmins = await User.findSuperAdmins();
    const invites = await CompanyInvite.findSuperAdminInvites();
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
      super_admins: superAdmins.map((u) => u.sanitize()),
      invites: formattedInvites
    });
  } catch (error) {
    logger.error('[Super Admin List Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve Super Admin team members.' });
  }
});

/**
 * POST /api/companies/admin/invite-super-admin
 * Protected route (Super Admin only):
 * Requires current Super Admin's password confirmation before generating a privileged Super Admin invite token.
 */
router.post('/admin/invite-super-admin', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { email, current_admin_password } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid recipient email address.' });
    }

    if (!current_admin_password) {
      return res.status(400).json({ error: 'Please enter your current Super Admin password for authorization.' });
    }

    // Verify current Super Admin password
    const currentAdmin = await User.findById(req.user.id);
    if (!currentAdmin) {
      return res.status(404).json({ error: 'Requesting Super Admin account not found.' });
    }

    const isMatch = await bcrypt.compare(current_admin_password, currentAdmin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect authorization password. Cannot issue Super Admin invitation.' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: `An active account with ${email} already exists on the platform.` });
    }

    // Create Super Admin invite
    const invite = await CompanyInvite.create({
      company_id: 'platform',
      email: email.trim().toLowerCase(),
      role: 'super_admin',
      invited_by: req.user.id,
      hoursValid: 72
    });

    const appOrigin = req.headers.origin || 'http://localhost:5173';
    const inviteLink = `${appOrigin}/invite/${invite.token}`;

    await sendSuperAdminInviteEmail({
      recipientEmail: invite.email,
      inviteLink,
      invitedByName: currentAdmin.name || currentAdmin.email,
      expiresHours: 72
    });

    logger.info(`[Super Admin Invite] ${currentAdmin.email} invited new Super Admin: ${email} [Link: ${inviteLink}]`);

    return res.status(201).json({
      message: `Super Admin invitation generated and sent to ${email}.`,
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
    logger.error('[Super Admin Invite Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to dispatch Super Admin invitation.' });
  }
});

/**
 * DELETE /api/companies/admin/super-admin-invites/:id
 * Protected route (Super Admin only): Revokes a pending Super Admin invite.
 */
router.delete('/admin/super-admin-invites/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await CompanyInvite.revokeSuperAdminInvite(id);
    return res.json({ message: 'Super Admin invitation revoked successfully.' });
  } catch (error) {
    logger.error(`[Revoke Super Admin Invite ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to revoke Super Admin invitation.' });
  }
});

/**
 * DELETE /api/companies/admin/super-admins/:id
 * Protected route (Super Admin only): Removes an auxiliary Super Admin account.
 */
router.delete('/admin/super-admins/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Security constraint: You cannot delete your own Super Admin account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser || targetUser.role !== 'super_admin') {
      return res.status(404).json({ error: 'Super Admin account not found.' });
    }

    await User.deleteUser(id);
    logger.info(`[Super Admin Revoked] ${req.user.email} removed Super Admin account: ${targetUser.email}`);

    return res.json({ message: `Super Admin account for ${targetUser.email} has been removed successfully.` });
  } catch (error) {
    logger.error(`[Delete Super Admin ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to remove Super Admin account.' });
  }
});

/**
 * GET /api/companies/admin/company-admins
 * Protected route (Super Admin only): Returns all registered Company Administrators across all finance companies.
 */
router.get('/admin/company-admins', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const admins = await User.findCompanyAdmins();
    return res.json({
      admins
    });
  } catch (error) {
    logger.error('[Get Company Admins Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve company administrators.' });
  }
});

/**
 * POST /api/companies/admin/create-admin
 * Protected route (Super Admin only): Directly creates a new Admin account for a specified Finance Company.
 */
router.post('/admin/create-admin', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      company_id,
      name,
      email,
      password_mode = 'manual',
      password: rawPassword
    } = req.body;

    if (!company_id) {
      return res.status(400).json({ error: 'Please select a Finance Company for this administrator.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Administrator full name is required.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid work email address.' });
    }

    // Verify company exists
    const company = await Company.findById(company_id);
    if (!company) {
      return res.status(404).json({ error: 'Selected Finance Company not found.' });
    }

    // Check if email is already registered
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: `An account with email ${email} already exists on Verdika.`
      });
    }

    // Handle password generation / validation
    let finalPassword = rawPassword;
    if (password_mode === 'auto' || !finalPassword) {
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      finalPassword = `VerdikaAdmin!${randomSuffix}`;
    } else if (finalPassword.length < 8) {
      return res.status(400).json({ error: 'Custom temporary password must be at least 8 characters long.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(finalPassword, saltRounds);

    const adminUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'admin',
      company_id: company.id
    });

    const appOrigin = req.headers.origin || 'http://localhost:5173';
    const loginUrl = `${appOrigin}/login`;
    const applyUrl = `${appOrigin}/apply/${company.slug}`;

    try {
      await sendCompanyAdminWelcomeEmail({
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        companyName: company.name,
        password: finalPassword,
        loginUrl,
        applyUrl
      });
    } catch (mailErr) {
      logger.error('[Create Admin Welcome Email Error]:', mailErr.message);
    }

    logger.info(`[Super Admin] Created Admin user ${adminUser.email} for Company "${company.name}" (ID: ${company.id})`);

    return res.status(201).json({
      message: `Administrator account for ${adminUser.name} created successfully!`,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        company_id: company.id,
        company_name: company.name,
        company_slug: company.slug,
        company_status: company.status,
        createdAt: adminUser.createdAt
      },
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug
      },
      temporary_password: finalPassword,
      login_url: loginUrl,
      apply_url: applyUrl
    });
  } catch (error) {
    logger.error('[Create Company Admin Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create company administrator.' });
  }
});

/**
 * DELETE /api/companies/admin/company-admins/:id
 * Protected route (Super Admin only): Revokes/removes a Company Admin account.
 */
router.delete('/admin/company-admins/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id);
    if (!targetUser || targetUser.role !== 'admin') {
      return res.status(404).json({ error: 'Company Admin account not found.' });
    }

    await User.deleteUser(id);
    logger.info(`[Company Admin Revoked] ${req.user.email} removed Company Admin: ${targetUser.email} (ID: ${id})`);

    return res.json({
      message: `Administrator account for ${targetUser.email} has been revoked and removed.`
    });
  } catch (error) {
    logger.error(`[Delete Company Admin ${req.params.id} Error]:`, error);
    return res.status(500).json({ error: 'Failed to revoke Company Admin account.' });
  }
});

export default router;


