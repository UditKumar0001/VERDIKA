import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSuperAdminCompanies,
  deactivateCompany,
  reactivateCompany,
  createFinanceCompany,
  getSuperAdmins,
  inviteSuperAdmin,
  revokeSuperAdminInvite,
  removeSuperAdmin
} from '../api/companyApi';

/**
 * Platform Super Admin Dashboard
 * Route: /super-admin/dashboard
 * Accessible strictly by platform-level Super Admins.
 * Features:
 * 1. Finance Company Governance & Soft-Deactivations
 * 2. Manual Sales-Assisted Company + Admin Creation
 * 3. Super Admin Team Management & Secure Password-Confirmed Invitations
 */
export default function SuperAdminDashboard() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active View Tab: 'companies' | 'super_admins'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'companies');

  // Companies Data State
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'removed'

  // Super Admins Data State
  const [superAdmins, setSuperAdmins] = useState([]);
  const [adminInvites, setAdminInvites] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Global Alerts State
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal 1: Deactivation Confirmation
  const [selectedDeactCompany, setSelectedDeactCompany] = useState(null);
  const [isProcessingDeact, setIsProcessingDeact] = useState(false);

  // Modal 2: Create Finance Company
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [createCompanyName, setCreateCompanyName] = useState('');
  const [createAdminName, setCreateAdminName] = useState('');
  const [createAdminEmail, setCreateAdminEmail] = useState('');
  const [createPasswordMode, setCreatePasswordMode] = useState('auto'); // 'auto' | 'manual'
  const [createCustomPassword, setCreateCustomPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [createdCompanyResult, setCreatedCompanyResult] = useState(null);
  const [createCompanyError, setCreateCompanyError] = useState(null);

  // Modal 3: Invite Super Admin
  const [showInviteAdminModal, setShowInviteAdminModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [showCurrentAdminPassword, setShowCurrentAdminPassword] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [createdInviteResult, setCreatedInviteResult] = useState(null);
  const [inviteAdminError, setInviteAdminError] = useState(null);

  // Copied State
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchCompaniesList = async () => {
    try {
      setLoadingCompanies(true);
      const data = await getSuperAdminCompanies();
      const list = data.companies || [];
      setCompanies(list);
      setError(null);

      const targetSlug = searchParams.get('deactivate');
      if (targetSlug && list.length > 0) {
        const target = list.find((c) => c.slug === targetSlug || c.id === targetSlug) || list[0];
        setSelectedDeactCompany(target);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve finance companies.');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchSuperAdminsList = async () => {
    try {
      setLoadingAdmins(true);
      const data = await getSuperAdmins();
      setSuperAdmins(data.super_admins || []);
      setAdminInvites(data.invites || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to retrieve Super Admin team.');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchCompaniesList();
    fetchSuperAdminsList();
  }, []);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam === 'create_company') {
      setShowCreateCompanyModal(true);
    } else if (modalParam === 'invite_admin') {
      setShowInviteAdminModal(true);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
    setError(null);
    setActionSuccess(null);
  };

  // Compute platform metrics
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status === 'active' || !c.status).length;
    const removed = companies.filter((c) => c.status === 'removed').length;
    const totalApps = companies.reduce((sum, c) => sum + (c.total_applications || 0), 0);
    const totalUnderwriters = companies.reduce((sum, c) => sum + (c.underwriters_count || 0), 0);
    return { total, active, removed, totalApps, totalUnderwriters };
  }, [companies]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      if (statusFilter === 'active' && comp.status === 'removed') return false;
      if (statusFilter === 'removed' && comp.status !== 'removed') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        comp.name?.toLowerCase().includes(q) ||
        comp.slug?.toLowerCase().includes(q) ||
        comp.admin_name?.toLowerCase().includes(q) ||
        comp.admin_email?.toLowerCase().includes(q) ||
        comp.email?.toLowerCase().includes(q)
      );
    });
  }, [companies, searchQuery, statusFilter]);

  // Handle Deactivation Confirmation
  const handleConfirmDeactivation = async () => {
    if (!selectedDeactCompany) return;
    setIsProcessingDeact(true);
    setActionSuccess(null);
    try {
      await deactivateCompany(selectedDeactCompany.id);
      setActionSuccess(`Company "${selectedDeactCompany.name}" has been deactivated successfully.`);
      setSelectedDeactCompany(null);
      await fetchCompaniesList();
    } catch (err) {
      setError(err.message || 'Failed to deactivate company.');
    } finally {
      setIsProcessingDeact(false);
    }
  };

  // Handle Reactivation
  const handleReactivate = async (comp) => {
    setIsProcessingDeact(true);
    setActionSuccess(null);
    try {
      await reactivateCompany(comp.id);
      setActionSuccess(`Company "${comp.name}" has been reactivated successfully.`);
      await fetchCompaniesList();
    } catch (err) {
      setError(err.message || 'Failed to reactivate company.');
    } finally {
      setIsProcessingDeact(false);
    }
  };

  // Handle Manual Company Creation Submit
  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    setCreateCompanyError(null);

    if (!createCompanyName.trim() || !createAdminName.trim() || !createAdminEmail.trim()) {
      setCreateCompanyError('Please fill in all required company and administrator fields.');
      return;
    }

    if (createPasswordMode === 'manual' && (!createCustomPassword || createCustomPassword.length < 8)) {
      setCreateCompanyError('Custom administrator password must be at least 8 characters long.');
      return;
    }

    setIsCreatingCompany(true);
    try {
      const res = await createFinanceCompany({
        company_name: createCompanyName.trim(),
        admin_name: createAdminName.trim(),
        admin_email: createAdminEmail.trim(),
        password_mode: createPasswordMode,
        password: createPasswordMode === 'manual' ? createCustomPassword : undefined
      });

      setCreatedCompanyResult(res);
      setActionSuccess(`Finance company "${res.company.name}" created successfully.`);
      await fetchCompaniesList();
    } catch (err) {
      setCreateCompanyError(err.message || 'Failed to create finance company.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleCloseCreateCompanyModal = () => {
    setShowCreateCompanyModal(false);
    setCreateCompanyName('');
    setCreateAdminName('');
    setCreateAdminEmail('');
    setCreatePasswordMode('auto');
    setCreateCustomPassword('');
    setCreatedCompanyResult(null);
    setCreateCompanyError(null);
  };

  // Handle Super Admin Invitation Submit
  const handleInviteAdminSubmit = async (e) => {
    e.preventDefault();
    setInviteAdminError(null);

    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setInviteAdminError('Please provide a valid work email address.');
      return;
    }

    if (!currentAdminPassword) {
      setInviteAdminError('Please enter your Super Admin password to authorize this invitation.');
      return;
    }

    setIsSendingInvite(true);
    try {
      const res = await inviteSuperAdmin({
        email: inviteEmail.trim(),
        current_admin_password: currentAdminPassword
      });

      setCreatedInviteResult(res.invite);
      setActionSuccess(`Super Admin invitation successfully issued for ${res.invite.email}.`);
      await fetchSuperAdminsList();
    } catch (err) {
      setInviteAdminError(err.message || 'Failed to dispatch Super Admin invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCloseInviteAdminModal = () => {
    setShowInviteAdminModal(false);
    setInviteEmail('');
    setCurrentAdminPassword('');
    setCreatedInviteResult(null);
    setInviteAdminError(null);
  };

  // Handle Revoke Super Admin Invite
  const handleRevokeInvite = async (inviteId) => {
    try {
      await revokeSuperAdminInvite(inviteId);
      setActionSuccess('Super Admin invitation revoked successfully.');
      await fetchSuperAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation.');
    }
  };

  // Handle Remove Super Admin User
  const handleRemoveSuperAdmin = async (adminUser) => {
    if (!window.confirm(`Are you sure you want to remove Super Admin privileges from "${adminUser.name || adminUser.email}"?`)) {
      return;
    }

    try {
      await removeSuperAdmin(adminUser.id);
      setActionSuccess(`Super Admin account for ${adminUser.email} has been removed.`);
      await fetchSuperAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to remove Super Admin.');
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="super-admin-page">
      <div className="super-admin-container">
        {/* Header Section */}
        <header className="super-admin-header">
          <div className="super-admin-header-title">
            <div className="super-admin-badge">
              <span className="super-admin-badge-dot"></span>
              <span>Platform Governance</span>
            </div>
            <h1 className="super-admin-title">
              Super Admin <span className="text-gradient">Console</span>
            </h1>
            <p className="super-admin-subtitle">
              Manage multi-tenant finance companies, onboard new lending institutions, and administer platform Super Admin access.
            </p>
          </div>

          <div className="super-admin-header-actions">
            {activeTab === 'companies' ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowCreateCompanyModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>+</span> Create Finance Company
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchCompaniesList}
                  disabled={loadingCompanies}
                  title="Refresh company data"
                >
                  🔄 Refresh List
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-primary btn-purple"
                  onClick={() => setShowInviteAdminModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>+</span> Invite Super Admin
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={fetchSuperAdminsList}
                  disabled={loadingAdmins}
                  title="Refresh Super Admin list"
                >
                  🔄 Refresh Admins
                </button>
              </>
            )}
            <Link to="/apply" className="btn-secondary" target="_blank" rel="noopener noreferrer">
              ↗ Public Marketplace
            </Link>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="super-admin-tab-nav">
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => handleTabChange('companies')}
          >
            🏢 Finance Companies <span className="tab-pill">{companies.length}</span>
          </button>
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'super_admins' ? 'active' : ''}`}
            onClick={() => handleTabChange('super_admins')}
          >
            🛡️ Manage Super Admins <span className="tab-pill purple">{superAdmins.length}</span>
          </button>
        </div>

        {/* Global Feedback Notifications */}
        {actionSuccess && (
          <div className="super-admin-alert success">
            <span>✅ {actionSuccess}</span>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setActionSuccess(null)}
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="super-admin-alert error">
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="alert-close-btn"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ===================================================================
            TAB 1: FINANCE COMPANIES DIRECTORY & STATS
            =================================================================== */}
        {activeTab === 'companies' && (
          <>
            {/* Metric Summary Cards */}
            <section className="super-admin-stats-grid">
              <div className="super-stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Total Companies</span>
                  <span className="stat-icon">🏢</span>
                </div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-footer">Registered platform tenants</div>
              </div>

              <div className="super-stat-card active-stat">
                <div className="stat-card-header">
                  <span className="stat-label">Active Lenders</span>
                  <span className="stat-icon">🟢</span>
                </div>
                <div className="stat-value">{stats.active}</div>
                <div className="stat-footer">Operational & accepting applications</div>
              </div>

              <div className="super-stat-card removed-stat">
                <div className="stat-card-header">
                  <span className="stat-label">Deactivated Lenders</span>
                  <span className="stat-icon">🔴</span>
                </div>
                <div className="stat-value">{stats.removed}</div>
                <div className="stat-footer">Soft-deleted / blocked from platform</div>
              </div>

              <div className="super-stat-card">
                <div className="stat-card-header">
                  <span className="stat-label">Total Platform Applications</span>
                  <span className="stat-icon">📑</span>
                </div>
                <div className="stat-value">{stats.totalApps}</div>
                <div className="stat-footer">Processed across all active & inactive tenants</div>
              </div>
            </section>

            {/* Companies Table Card */}
            <section className="super-admin-table-card">
              {/* Card Toolbar */}
              <div className="table-card-toolbar">
                <div className="toolbar-search-box">
                  <span style={{ fontSize: '1rem', marginRight: '0.4rem', opacity: 0.7 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search by company name, slug, or admin email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="toolbar-search-input"
                  />
                </div>

                <div className="filter-pill-group">
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({companies.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active ({stats.active})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'removed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('removed')}
                  >
                    Removed ({stats.removed})
                  </button>
                </div>
              </div>

              {/* Table Content */}
              <div className="super-admin-table-wrapper">
                <table className="super-admin-table">
                  <thead>
                    <tr>
                      <th>Company Details</th>
                      <th>Admin Contact</th>
                      <th style={{ textAlign: 'center' }}>Underwriters</th>
                      <th style={{ textAlign: 'center' }}>Total Applications</th>
                      <th>Date Registered</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCompanies ? (
                      <tr>
                        <td colSpan="7" className="table-loading-state">
                          <div className="inline-spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
                          <p>Loading platform finance companies...</p>
                        </td>
                      </tr>
                    ) : filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="table-empty-state">
                          <span className="empty-icon">🏢</span>
                          <h3>No Finance Companies Found</h3>
                          <p>Try adjusting your search query or status filter.</p>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                            }}
                          >
                            Reset Filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((comp) => {
                        const isRemoved = comp.status === 'removed';
                        const gatewayUrl = `/apply/${comp.slug}`;

                        return (
                          <tr key={comp.id} className={isRemoved ? 'row-removed' : ''}>
                            {/* Company Name & Slug */}
                            <td>
                              <div className="company-cell-info">
                                <span className="company-cell-name">{comp.name}</span>
                                <span className="company-cell-slug">
                                  <code>/apply/{comp.slug}</code>
                                  <Link
                                    to={gatewayUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-ext"
                                    title="Open merchant application link"
                                  >
                                    ↗
                                  </Link>
                                </span>
                              </div>
                            </td>

                            {/* Admin Contact */}
                            <td>
                              <div className="admin-cell-info">
                                <span className="admin-cell-name">{comp.admin_name || 'System Administrator'}</span>
                                <span className="admin-cell-email">{comp.admin_email || comp.email}</span>
                              </div>
                            </td>

                            {/* Underwriters Count */}
                            <td style={{ textAlign: 'center' }}>
                              <span className="count-badge">
                                {comp.underwriters_count || 0}
                              </span>
                            </td>

                            {/* Total Applications Count */}
                            <td style={{ textAlign: 'center' }}>
                              <span className="app-count-badge">
                                {comp.total_applications || 0}
                              </span>
                            </td>

                            {/* Date Registered */}
                            <td>
                              <span className="date-text">{formatDate(comp.created_at)}</span>
                            </td>

                            {/* Status */}
                            <td style={{ textAlign: 'center' }}>
                              {isRemoved ? (
                                <span className="status-pill status-removed">
                                  <span className="status-dot"></span>
                                  Removed
                                </span>
                              ) : (
                                <span className="status-pill status-active">
                                  <span className="status-dot"></span>
                                  Active
                                </span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-wrap">
                                {isRemoved ? (
                                  <button
                                    type="button"
                                    className="btn-table-reactivate"
                                    onClick={() => handleReactivate(comp)}
                                    disabled={isProcessingDeact}
                                    title="Reactivate company account & restore access"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-table-remove"
                                    onClick={() => setSelectedDeactCompany(comp)}
                                    disabled={isProcessingDeact}
                                    title="Soft-delete company and block access"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ===================================================================
            TAB 2: MANAGE SUPER ADMINS & INVITATIONS
            =================================================================== */}
        {activeTab === 'super_admins' && (
          <div className="super-admin-team-section">
            {/* Active Super Admins Table */}
            <section className="super-admin-table-card" style={{ marginBottom: '2rem' }}>
              <div className="table-card-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                    Active Super Administrators
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Platform governance accounts with full unrestricted system privileges.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary btn-purple"
                  onClick={() => setShowInviteAdminModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span>+</span> Invite Super Admin
                </button>
              </div>

              <div className="super-admin-table-wrapper">
                <table className="super-admin-table">
                  <thead>
                    <tr>
                      <th>Super Admin Name</th>
                      <th>Email Address</th>
                      <th>Platform Role</th>
                      <th>Date Registered</th>
                      <th style={{ textAlign: 'center' }}>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAdmins ? (
                      <tr>
                        <td colSpan="6" className="table-loading-state">
                          <div className="inline-spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
                          <p>Loading Super Admin team...</p>
                        </td>
                      </tr>
                    ) : superAdmins.map((sa) => {
                      const isSelf = sa.id === currentUser?.id || sa.email === currentUser?.email;

                      return (
                        <tr key={sa.id}>
                          <td>
                            <div className="admin-cell-info">
                              <span className="admin-cell-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🛡️ {sa.name || 'Platform Super Admin'}
                                {isSelf && (
                                  <span className="chip-self-badge">You (Current)</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            <code style={{ color: 'var(--accent-cyan)', fontSize: '0.88rem' }}>{sa.email}</code>
                          </td>
                          <td>
                            <span className="count-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                              SUPER ADMIN
                            </span>
                          </td>
                          <td>
                            <span className="date-text">{formatDate(sa.created_at || sa.createdAt)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="status-pill status-active">
                              <span className="status-dot"></span> Active
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="action-buttons-wrap">
                              {isSelf ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                  Active Session
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-table-remove"
                                  onClick={() => handleRemoveSuperAdmin(sa)}
                                  title="Revoke Super Admin privileges"
                                >
                                  Revoke Access
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Pending Super Admin Invitations Table */}
            <section className="super-admin-table-card">
              <div className="table-card-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                    Pending Super Admin Invitations
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Time-limited secure onboarding links generated for new platform owners.
                  </p>
                </div>
              </div>

              <div className="super-admin-table-wrapper">
                <table className="super-admin-table">
                  <thead>
                    <tr>
                      <th>Recipient Email</th>
                      <th>Invitation Link</th>
                      <th>Expires In / At</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminInvites.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="table-empty-state" style={{ padding: '2.5rem' }}>
                          <span className="empty-icon">✉️</span>
                          <h3>No Pending Super Admin Invitations</h3>
                          <p>Click "Invite Super Admin" above to send an onboarding link.</p>
                        </td>
                      </tr>
                    ) : (
                      adminInvites.map((inv) => {
                        const isRevoked = inv.status === 'revoked';
                        const isExpired = inv.status === 'expired';
                        const isPending = inv.status === 'pending';

                        return (
                          <tr key={inv.id} className={!isPending ? 'row-removed' : ''}>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.email}</span>
                            </td>
                            <td>
                              {isPending ? (
                                <button
                                  type="button"
                                  className="btn-copy-link"
                                  onClick={() => handleCopyToClipboard(inv.invite_link, inv.id)}
                                >
                                  {copiedKey === inv.id ? '✓ Copied!' : '📋 Copy Invite Link'}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Unavailable</span>
                              )}
                            </td>
                            <td>
                              <span className="date-text">{formatDate(inv.expires_at)}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isPending && (
                                <span className="status-pill status-active" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.35)' }}>
                                  <span className="status-dot"></span> Pending (72h)
                                </span>
                              )}
                              {isRevoked && (
                                <span className="status-pill status-removed">
                                  <span className="status-dot"></span> Revoked
                                </span>
                              )}
                              {isExpired && (
                                <span className="status-pill status-removed">
                                  <span className="status-dot"></span> Expired
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isPending && (
                                <button
                                  type="button"
                                  className="btn-table-remove"
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  title="Revoke invitation link"
                                >
                                  Revoke Link
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            MODAL 1: COMPANY DEACTIVATION CONFIRMATION
            =================================================================== */}
        {selectedDeactCompany && (
          <div className="super-modal-backdrop" onClick={() => !isProcessingDeact && setSelectedDeactCompany(null)}>
            <div className="super-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header">
                <span className="super-modal-warning-icon">⚠️</span>
                <div className="super-modal-header-text">
                  <h3>Confirm Company Deactivation</h3>
                  <p>You are about to soft-deactivate an institutional finance tenant.</p>
                </div>
              </div>

              <div className="super-modal-body">
                <div className="super-modal-warning-box">
                  <strong>This will deactivate {selectedDeactCompany.name}'s account.</strong> Their admin and all underwriters will lose access immediately, and their public application link will stop accepting new applications.
                  <br /><br />
                  Existing application data will be retained for record-keeping and compliance, but will remain inaccessible unless restored. Are you sure?
                </div>

                <div className="super-modal-details-summary">
                  <div className="detail-row">
                    <span className="detail-label">Company:</span>
                    <span className="detail-val">{selectedDeactCompany.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gateway Slug:</span>
                    <span className="detail-val"><code>/apply/{selectedDeactCompany.slug}</code></span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Admin Email:</span>
                    <span className="detail-val">{selectedDeactCompany.admin_email || selectedDeactCompany.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Associated Applications:</span>
                    <span className="detail-val">{selectedDeactCompany.total_applications || 0}</span>
                  </div>
                </div>
              </div>

              <div className="super-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedDeactCompany(null)}
                  disabled={isProcessingDeact}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger-confirm"
                  onClick={handleConfirmDeactivation}
                  disabled={isProcessingDeact}
                >
                  {isProcessingDeact ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 2: MANUAL CREATE FINANCE COMPANY
            =================================================================== */}
        {showCreateCompanyModal && (
          <div className="super-modal-backdrop" onClick={() => !isCreatingCompany && handleCloseCreateCompanyModal()}>
            <div className="super-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header" style={{ borderBottomColor: 'var(--border-card)' }}>
                <span style={{ fontSize: '2rem' }}>🏢</span>
                <div className="super-modal-header-text">
                  <h3 style={{ color: 'var(--text-main)' }}>Create Finance Company</h3>
                  <p>Provision an institutional tenancy and administrator account directly.</p>
                </div>
              </div>

              {createdCompanyResult ? (
                /* Success View with Credentials */
                <div className="super-modal-body">
                  <div className="super-modal-success-box">
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
                    <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>Company & Admin Created!</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      Tenancy <strong>{createdCompanyResult.company.name}</strong> is now live on Verdika.
                    </p>
                  </div>

                  <div className="super-modal-details-summary" style={{ marginTop: '1.25rem' }}>
                    <div className="detail-row">
                      <span className="detail-label">Company Name:</span>
                      <span className="detail-val">{createdCompanyResult.company.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Public Gateway:</span>
                      <span className="detail-val">
                        <code>{createdCompanyResult.company.apply_url}</code>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Admin Name:</span>
                      <span className="detail-val">{createdCompanyResult.admin.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Admin Email:</span>
                      <span className="detail-val">{createdCompanyResult.admin.email}</span>
                    </div>
                    <div className="detail-row" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      <span className="detail-label" style={{ color: 'var(--accent-cyan)' }}>Temporary Password:</span>
                      <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '0.95rem' }}>{createdCompanyResult.credentials.password}</code>
                        <button
                          type="button"
                          className="btn-copy-small"
                          onClick={() => handleCopyToClipboard(createdCompanyResult.credentials.password, 'pwd')}
                        >
                          {copiedKey === 'pwd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '1rem', textAlign: 'center' }}>
                    ✉️ An onboarding email containing these credentials and portal links has been dispatched to {createdCompanyResult.admin.email}.
                  </p>

                  <div className="super-modal-footer" style={{ marginTop: '1.5rem', padding: 0, border: 'none' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleCloseCreateCompanyModal}
                    >
                      Done & Return to Console
                    </button>
                  </div>
                </div>
              ) : (
                /* Creation Form */
                <form onSubmit={handleCreateCompanySubmit}>
                  <div className="super-modal-body">
                    {createCompanyError && (
                      <div className="super-admin-alert error" style={{ marginBottom: '1rem' }}>
                        <span>⚠️ {createCompanyError}</span>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Company / Institution Legal Name *
                      </label>
                      <input
                        type="text"
                        className="modal-text-input"
                        placeholder="e.g. Apex Growth Capital"
                        value={createCompanyName}
                        onChange={(e) => setCreateCompanyName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          Admin Full Name *
                        </label>
                        <input
                          type="text"
                          className="modal-text-input"
                          placeholder="e.g. Vikram Malhotra"
                          value={createAdminName}
                          onChange={(e) => setCreateAdminName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          Admin Work Email *
                        </label>
                        <input
                          type="email"
                          className="modal-text-input"
                          placeholder="vikram@apexgrowth.com"
                          value={createAdminEmail}
                          onChange={(e) => setCreateAdminEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Mode Selection */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Administrator Password Provisioning
                      </label>
                      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="pwd_mode"
                            value="auto"
                            checked={createPasswordMode === 'auto'}
                            onChange={() => setCreatePasswordMode('auto')}
                          />
                          ⚡ Auto-generate secure temporary password (Recommended)
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="pwd_mode"
                            value="manual"
                            checked={createPasswordMode === 'manual'}
                            onChange={() => setCreatePasswordMode('manual')}
                          />
                          🔑 Set custom password
                        </label>
                      </div>

                      {createPasswordMode === 'manual' && (
                        <div className="password-input-wrapper">
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            className="modal-text-input"
                            placeholder="Min. 8 characters"
                            value={createCustomPassword}
                            onChange={(e) => setCreateCustomPassword(e.target.value)}
                            required={createPasswordMode === 'manual'}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                          >
                            {showCreatePassword ? '👁️' : '🔒'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="super-modal-footer">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCloseCreateCompanyModal}
                      disabled={isCreatingCompany}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isCreatingCompany}
                    >
                      {isCreatingCompany ? 'Provisioning Tenancy...' : 'Create Company & Admin →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 3: INVITE SUPER ADMIN (WITH PASSWORD RE-AUTH)
            =================================================================== */}
        {showInviteAdminModal && (
          <div className="super-modal-backdrop" onClick={() => !isSendingInvite && handleCloseInviteAdminModal()}>
            <div className="super-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header" style={{ borderBottomColor: 'var(--border-card)' }}>
                <span style={{ fontSize: '2rem' }}>🛡️</span>
                <div className="super-modal-header-text">
                  <h3 style={{ color: '#c084fc' }}>Invite Platform Super Admin</h3>
                  <p>Grant full platform administration access with high security authorization.</p>
                </div>
              </div>

              {createdInviteResult ? (
                /* Success View with Invite Link */
                <div className="super-modal-body">
                  <div className="super-modal-success-box" style={{ background: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>✉️</span>
                    <h3 style={{ color: '#c084fc', margin: '0 0 0.5rem 0' }}>Super Admin Invitation Dispatched</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      An invitation token has been created for <strong>{createdInviteResult.email}</strong>.
                    </p>
                  </div>

                  <div className="super-modal-details-summary" style={{ marginTop: '1.25rem' }}>
                    <div className="detail-row">
                      <span className="detail-label">Recipient:</span>
                      <span className="detail-val">{createdInviteResult.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Role Granted:</span>
                      <span className="detail-val" style={{ color: '#c084fc' }}>PLATFORM SUPER ADMIN</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expires:</span>
                      <span className="detail-val">72 Hours ({formatDate(createdInviteResult.expires_at)})</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                      Direct Onboarding Link (Shareable)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={createdInviteResult.invite_link}
                        className="modal-text-input"
                        style={{ fontSize: '0.82rem', background: 'rgba(15, 23, 42, 0.6)' }}
                      />
                      <button
                        type="button"
                        className="btn-primary btn-purple"
                        onClick={() => handleCopyToClipboard(createdInviteResult.invite_link, 'inv_link')}
                      >
                        {copiedKey === 'inv_link' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="super-modal-footer" style={{ marginTop: '1.5rem', padding: 0, border: 'none' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleCloseInviteAdminModal}
                    >
                      Done & Return to Console
                    </button>
                  </div>
                </div>
              ) : (
                /* Invitation Form */
                <form onSubmit={handleInviteAdminSubmit}>
                  <div className="super-modal-body">
                    {inviteAdminError && (
                      <div className="super-admin-alert error" style={{ marginBottom: '1rem' }}>
                        <span>⚠️ {inviteAdminError}</span>
                      </div>
                    )}

                    {/* High Privilege Warning Box */}
                    <div className="super-modal-warning-box" style={{ background: 'rgba(168, 85, 247, 0.08)', borderColor: 'rgba(168, 85, 247, 0.3)', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                      <strong style={{ color: '#c084fc' }}>🔒 High-Privilege Security Notice:</strong>
                      <br />
                      Super Admins hold platform-wide authority, including the ability to inspect all loan applications, manage company registrations, and configure global policies.
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        New Super Admin Email Address *
                      </label>
                      <input
                        type="email"
                        className="modal-text-input"
                        placeholder="new.admin@verdika.internal"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    {/* Re-Auth Password Confirmation */}
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        Confirm Your Super Admin Password (Authorization Check) *
                      </label>
                      <div className="password-input-wrapper">
                        <input
                          type={showCurrentAdminPassword ? 'text' : 'password'}
                          className="modal-text-input"
                          placeholder="Re-enter your password to authorize invite"
                          value={currentAdminPassword}
                          onChange={(e) => setCurrentAdminPassword(e.target.value)}
                          required
                          style={{ borderColor: 'rgba(6, 182, 212, 0.4)' }}
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowCurrentAdminPassword(!showCurrentAdminPassword)}
                        >
                          {showCurrentAdminPassword ? '👁️' : '🔒'}
                        </button>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
                        Required to verify you are authorized to issue root platform privileges.
                      </span>
                    </div>
                  </div>

                  <div className="super-modal-footer">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCloseInviteAdminModal}
                      disabled={isSendingInvite}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary btn-purple"
                      disabled={isSendingInvite}
                    >
                      {isSendingInvite ? 'Authorizing & Inviting...' : 'Authorize & Issue Invite →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
