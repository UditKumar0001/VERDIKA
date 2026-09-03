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
  removeSuperAdmin,
  getCompanyAdmins,
  createCompanyAdmin,
  removeCompanyAdmin
} from '../api/companyApi';
import { getAuthToken, removeAuthToken } from '../api/config.js';

/**
 * Platform Super Admin Dashboard
 * Route: /super-admin/dashboard
 * Accessible strictly by platform-level Super Admins.
 * Features:
 * 1. Finance Company Governance & Soft-Deactivations
 * 2. Manage Company Admins (Role: 'admin') & Direct Provisioning
 * 3. Manage Super Admins (Role: 'super_admin') & Password-Confirmed Invitations
 */
export default function SuperAdminDashboard() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active View Tab: 'companies' | 'company_admins' | 'super_admins'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'companies');

  // Companies Data State
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' (default) | 'all' | 'removed'

  // Company Admins Data State (Role: 'admin')
  const [companyAdmins, setCompanyAdmins] = useState([]);
  const [loadingCompanyAdmins, setLoadingCompanyAdmins] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Super Admins Data State (Role: 'super_admin')
  const [superAdmins, setSuperAdmins] = useState([]);
  const [adminInvites, setAdminInvites] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Global Alerts State
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal 1: Company Deactivation Confirmation
  const [selectedDeactCompany, setSelectedDeactCompany] = useState(null);
  const [isProcessingDeact, setIsProcessingDeact] = useState(false);

  // Modal 2: Create Finance Company + Admin
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

  // Modal 4: Create Company Admin
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminCompanyId, setNewAdminCompanyId] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPasswordMode, setNewAdminPasswordMode] = useState('auto'); // 'auto' | 'manual'
  const [newAdminCustomPassword, setNewAdminCustomPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createdAdminResult, setCreatedAdminResult] = useState(null);
  const [createAdminError, setCreateAdminError] = useState(null);

  // Modal 5: Revoke Company Admin Confirmation
  const [adminToRevoke, setAdminToRevoke] = useState(null);
  const [isRevokingAdmin, setIsRevokingAdmin] = useState(false);

  // Copied State
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchCompaniesList = async () => {
    try {
      setLoadingCompanies(true);
      const data = await getSuperAdminCompanies();
      const list = data.companies || [];
      setCompanies(list);
      setError(null);

      // Clean up any stale deactivate param from URL so it never auto-triggers
      if (searchParams.has('deactivate')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('deactivate');
        setSearchParams(nextParams, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve finance companies.');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchCompanyAdminsList = async () => {
    try {
      setLoadingCompanyAdmins(true);
      const data = await getCompanyAdmins();
      setCompanyAdmins(data.admins || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to retrieve company administrators.');
    } finally {
      setLoadingCompanyAdmins(false);
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
    const token = getAuthToken();
    if (!token) {
      setError('Your secure session token is missing. Please click "Sign In Again" below.');
      setLoadingCompanies(false);
      return;
    }
    fetchCompaniesList();
    fetchCompanyAdminsList();
    fetchSuperAdminsList();
  }, []);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam === 'create_company') {
      setShowCreateCompanyModal(true);
    } else if (modalParam === 'invite_admin') {
      setShowInviteAdminModal(true);
    } else if (modalParam === 'create_admin') {
      setShowCreateAdminModal(true);
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
        comp.admin_email?.toLowerCase().includes(q)
      );
    });
  }, [companies, statusFilter, searchQuery]);

  // Filtered company admins
  const filteredCompanyAdmins = useMemo(() => {
    if (!adminSearchQuery.trim()) return companyAdmins;
    const q = adminSearchQuery.toLowerCase().trim();
    return companyAdmins.filter(
      (adm) =>
        adm.name?.toLowerCase().includes(q) ||
        adm.email?.toLowerCase().includes(q) ||
        adm.company_name?.toLowerCase().includes(q)
    );
  }, [companyAdmins, adminSearchQuery]);

  // Active companies available for admin assignment
  const activeCompaniesList = useMemo(() => {
    return companies.filter((c) => c.status !== 'removed');
  }, [companies]);

  // Action: Deactivate Company
  const handleConfirmDeactivation = async () => {
    if (!selectedDeactCompany) return;
    const targetCompany = selectedDeactCompany;
    setSelectedDeactCompany(null); // Close modal immediately to prevent duplicate requests

    try {
      setIsProcessingDeact(true);
      setError(null);
      await deactivateCompany(targetCompany.id);
      setActionSuccess(`Successfully deactivated "${targetCompany.name}". The company and its underwriters are now blocked from accessing the platform.`);

      if (searchParams.has('deactivate')) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('deactivate');
        setSearchParams(nextParams, { replace: true });
      }

      await fetchCompaniesList();
      await fetchCompanyAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to deactivate company.');
    } finally {
      setIsProcessingDeact(false);
    }
  };

  // Action: Reactivate Company
  const handleReactivateCompany = async (company) => {
    try {
      setError(null);
      await reactivateCompany(company.id);
      setActionSuccess(`Successfully reactivated "${company.name}". Tenant access and application gateway have been restored.`);
      await fetchCompaniesList();
      await fetchCompanyAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to reactivate company.');
    }
  };

  // Action: Create Finance Company & Admin
  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingCompany(true);
      setCreateCompanyError(null);

      const payload = {
        company_name: createCompanyName.trim(),
        admin_name: createAdminName.trim(),
        admin_email: createAdminEmail.trim().toLowerCase(),
        password_mode: createPasswordMode,
        password: createPasswordMode === 'manual' ? createCustomPassword : null
      };

      const result = await createFinanceCompany(payload);
      setCreatedCompanyResult(result);
      setActionSuccess(`Finance company "${result.company.name}" created successfully!`);
      await fetchCompaniesList();
      await fetchCompanyAdminsList();
    } catch (err) {
      setCreateCompanyError(err.message || 'Failed to create finance company.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleCloseCreateCompanyModal = () => {
    setShowCreateCompanyModal(false);
    setCreatedCompanyResult(null);
    setCreateCompanyError(null);
    setCreateCompanyName('');
    setCreateAdminName('');
    setCreateAdminEmail('');
    setCreatePasswordMode('auto');
    setCreateCustomPassword('');
    setShowCreatePassword(false);
  };

  // Action: Create Company Admin directly
  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingAdmin(true);
      setCreateAdminError(null);

      const payload = {
        company_id: newAdminCompanyId,
        name: newAdminName.trim(),
        email: newAdminEmail.trim().toLowerCase(),
        password_mode: newAdminPasswordMode,
        password: newAdminPasswordMode === 'manual' ? newAdminCustomPassword : null
      };

      const result = await createCompanyAdmin(payload);
      setCreatedAdminResult(result);
      setActionSuccess(`Administrator account for ${result.admin.name} created successfully!`);
      await fetchCompanyAdminsList();
      await fetchCompaniesList();
    } catch (err) {
      setCreateAdminError(err.message || 'Failed to create company administrator.');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleCloseCreateAdminModal = () => {
    setShowCreateAdminModal(false);
    setCreatedAdminResult(null);
    setCreateAdminError(null);
    setNewAdminCompanyId('');
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPasswordMode('auto');
    setNewAdminCustomPassword('');
    setShowNewAdminPassword(false);
  };

  // Action: Revoke Company Admin
  const handleConfirmRevokeAdmin = async () => {
    if (!adminToRevoke) return;
    try {
      setIsRevokingAdmin(true);
      setError(null);
      await removeCompanyAdmin(adminToRevoke.id);
      setActionSuccess(`Administrator account for ${adminToRevoke.email} has been revoked.`);
      setAdminToRevoke(null);
      await fetchCompanyAdminsList();
      await fetchCompaniesList();
    } catch (err) {
      setError(err.message || 'Failed to revoke administrator access.');
    } finally {
      setIsRevokingAdmin(false);
    }
  };

  // Action: Invite Super Admin
  const handleInviteAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSendingInvite(true);
      setInviteAdminError(null);

      const result = await inviteSuperAdmin({
        email: inviteEmail.trim().toLowerCase(),
        current_admin_password: currentAdminPassword
      });

      setCreatedInviteResult(result.invite);
      setActionSuccess(`Super Admin invitation generated for ${inviteEmail}!`);
      setCurrentAdminPassword('');
      await fetchSuperAdminsList();
    } catch (err) {
      setInviteAdminError(err.message || 'Failed to issue Super Admin invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCloseInviteAdminModal = () => {
    setShowInviteAdminModal(false);
    setCreatedInviteResult(null);
    setInviteAdminError(null);
    setInviteEmail('');
    setCurrentAdminPassword('');
    setShowCurrentAdminPassword(false);
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      setError(null);
      await revokeSuperAdminInvite(inviteId);
      setActionSuccess('Super Admin invitation revoked.');
      await fetchSuperAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to revoke invite.');
    }
  };

  const handleRemoveSuperAdmin = async (adminUser) => {
    if (adminUser.id === currentUser?.id || adminUser.email === currentUser?.email) {
      setError('You cannot remove your own Super Admin account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke Super Admin access for ${adminUser.name || adminUser.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await removeSuperAdmin(adminUser.id);
      setActionSuccess(`Removed Super Admin privileges for ${adminUser.email}.`);
      await fetchSuperAdminsList();
    } catch (err) {
      setError(err.message || 'Failed to remove Super Admin.');
    }
  };

  const handleCopyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    try {
      return new Date(isoDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="dashboard-container super-admin-page">
      <div className="dashboard-content" style={{ maxWidth: '1360px', margin: '0 auto' }}>
        
        {/* Header Banner */}
        <div className="super-admin-header">
          <div>
            <div className="super-admin-badge">
              <span className="badge-dot"></span> PLATFORM GOVERNANCE
            </div>
            <h1 className="super-admin-title">Super Admin Console</h1>
            <p className="super-admin-subtitle">
              Manage multi-tenant finance companies, onboard new lending institutions, and administer platform Admin & Super Admin access.
            </p>
          </div>

          <div className="header-actions-group">
            {activeTab === 'companies' && (
              <button
                type="button"
                className="new-app-btn"
                onClick={() => setShowCreateCompanyModal(true)}
              >
                <span>+</span> Create Finance Company
              </button>
            )}

            {activeTab === 'company_admins' && (
              <button
                type="button"
                className="new-app-btn btn-purple"
                onClick={() => {
                  if (activeCompaniesList.length > 0 && !newAdminCompanyId) {
                    setNewAdminCompanyId(activeCompaniesList[0].id);
                  }
                  setShowCreateAdminModal(true);
                }}
              >
                <span>+</span> Create New Admin
              </button>
            )}

            {activeTab === 'super_admins' && (
              <button
                type="button"
                className="new-app-btn btn-purple"
                onClick={() => setShowInviteAdminModal(true)}
              >
                <span>+</span> Invite Super Admin
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                fetchCompaniesList();
                fetchCompanyAdminsList();
                fetchSuperAdminsList();
              }}
              title="Refresh console records"
            >
              🔄 Refresh
            </button>

            <Link
              to="/apply"
              className="btn-secondary"
              target="_blank"
              rel="noreferrer"
              title="View the public merchant application directory"
            >
              ↗ Public Marketplace
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="super-admin-tab-nav">
          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => handleTabChange('companies')}
          >
            <span>🏛️</span> Finance Companies
            <span className="tab-pill">{stats.total}</span>
          </button>

          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'company_admins' ? 'active' : ''}`}
            onClick={() => handleTabChange('company_admins')}
          >
            <span>👤</span> Manage Admins
            <span className="tab-pill purple">{companyAdmins.length}</span>
          </button>

          <button
            type="button"
            className={`tab-nav-btn ${activeTab === 'super_admins' ? 'active' : ''}`}
            onClick={() => handleTabChange('super_admins')}
          >
            <span>🛡️</span> Manage Super Admins
            <span className="tab-pill purple">{superAdmins.length}</span>
          </button>
        </div>

        {/* Global Feedback Banners */}
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
          <div className="super-admin-alert error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span>⚠️ {error}</span>
            {(error.includes('token') || error.includes('Unauthorized') || error.includes('session') || error.includes('expired')) && (
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '6px' }}
                onClick={() => {
                  removeAuthToken();
                  window.location.href = '/login';
                }}
              >
                🔑 Sign In Again →
              </button>
            )}
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
                    className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active ({stats.active})
                  </button>
                  <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({companies.length})
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
                      <th>Company Name</th>
                      <th>Slug Gateway</th>
                      <th>Admin Name</th>
                      <th>Admin Email</th>
                      <th style={{ textAlign: 'center' }}>Underwriters</th>
                      <th style={{ textAlign: 'center' }}>Applications</th>
                      <th>Date Added</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCompanies ? (
                      <tr>
                        <td colSpan="9" className="table-loading-state">
                          <div className="inline-spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
                          <p>Loading registered finance companies...</p>
                        </td>
                      </tr>
                    ) : filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="table-empty-state">
                          <span className="empty-icon">🏢</span>
                          <h3>No Companies Found</h3>
                          <p>No finance companies match the current search filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((company) => {
                        const isRemoved = company.status === 'removed';

                        return (
                          <tr key={company.id} className={isRemoved ? 'row-removed' : ''}>
                            <td>
                              <div className="company-cell-name">
                                <span className="company-icon-avatar">🏛️</span>
                                <div>
                                  <div className="company-title">{company.name}</div>
                                  <div className="company-id-sub">{company.id}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <Link
                                to={`/apply/${company.slug}`}
                                className="company-slug-link"
                                target="_blank"
                                rel="noreferrer"
                                title="Open tenant merchant application portal"
                              >
                                /{company.slug} ↗
                              </Link>
                            </td>
                            <td>
                              <span className="admin-name-text">{company.admin_name || 'N/A'}</span>
                            </td>
                            <td>
                              <code className="admin-email-code">{company.admin_email || company.email || 'N/A'}</code>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="count-badge count-underwriters">
                                {company.underwriters_count || 0}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="count-badge count-apps">
                                {company.total_applications || 0}
                              </span>
                            </td>
                            <td>
                              <span className="date-text">{formatDate(company.createdAt || company.created_at)}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isRemoved ? (
                                <span className="status-pill status-removed">
                                  <span className="status-dot"></span> Removed
                                </span>
                              ) : (
                                <span className="status-pill status-active">
                                  <span className="status-dot"></span> Active
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-wrap">
                                {isRemoved ? (
                                  <button
                                    type="button"
                                    className="btn-table-restore"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReactivateCompany(company);
                                    }}
                                    title="Restore company access"
                                  >
                                    Reactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-table-remove"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDeactCompany(company);
                                    }}
                                    title="Deactivate company from platform"
                                  >
                                    Deactivate
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
            TAB 2: MANAGE COMPANY ADMINS (Role: 'admin')
            =================================================================== */}
        {activeTab === 'company_admins' && (
          <div className="super-admin-team-section">
            <section className="super-admin-table-card">
              <div className="table-card-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    Active Finance Company Administrators
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Company-level administrators managing tenant loan policies, underwriting queues, and risk parameters.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div className="toolbar-search-box" style={{ width: '260px' }}>
                    <span style={{ fontSize: '0.9rem', marginRight: '0.4rem', opacity: 0.7 }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search admins or company..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="toolbar-search-input"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary btn-purple"
                    onClick={() => {
                      if (activeCompaniesList.length > 0 && !newAdminCompanyId) {
                        setNewAdminCompanyId(activeCompaniesList[0].id);
                      }
                      setShowCreateAdminModal(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>+</span> Create New Admin
                  </button>
                </div>
              </div>

              <div className="super-admin-table-wrapper">
                <table className="super-admin-table">
                  <thead>
                    <tr>
                      <th>Admin Name</th>
                      <th>Email Address</th>
                      <th>Finance Company / Tenant</th>
                      <th>Platform Role</th>
                      <th>Date Registered</th>
                      <th style={{ textAlign: 'center' }}>Account Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCompanyAdmins ? (
                      <tr>
                        <td colSpan="7" className="table-loading-state">
                          <div className="inline-spinner" style={{ width: '30px', height: '30px', margin: '0 auto' }}></div>
                          <p>Loading company administrators...</p>
                        </td>
                      </tr>
                    ) : filteredCompanyAdmins.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="table-empty-state" style={{ padding: '2.5rem' }}>
                          <span className="empty-icon">👤</span>
                          <h3>No Company Administrators Found</h3>
                          <p>Click "Create New Admin" above to provision an administrator for an existing finance company.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCompanyAdmins.map((adminUser) => {
                        const isDeactivatedCompany = adminUser.company_status === 'removed';

                        return (
                          <tr key={adminUser.id}>
                            <td>
                              <div className="admin-cell-info">
                                <span className="admin-cell-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                                  👤 {adminUser.name || 'Company Administrator'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <code style={{ color: 'var(--accent-cyan)', fontSize: '0.88rem' }}>{adminUser.email}</code>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                  {adminUser.company_name}
                                </span>
                                {adminUser.company_slug && (
                                  <Link
                                    to={`/apply/${adminUser.company_slug}`}
                                    className="btn-copy-small"
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ textDecoration: 'none' }}
                                  >
                                    /{adminUser.company_slug} ↗
                                  </Link>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="count-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', fontWeight: 700 }}>
                                ADMIN
                              </span>
                            </td>
                            <td>
                              <span className="date-text">{formatDate(adminUser.createdAt || adminUser.created_at)}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isDeactivatedCompany ? (
                                <span className="status-pill status-removed">
                                  <span className="status-dot"></span> Company Inactive
                                </span>
                              ) : (
                                <span className="status-pill status-active">
                                  <span className="status-dot"></span> Active
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons-wrap">
                                <button
                                  type="button"
                                  className="btn-table-remove"
                                  onClick={() => setAdminToRevoke(adminUser)}
                                  title="Revoke Admin privileges"
                                >
                                  Revoke Access
                                </button>
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
          </div>
        )}

        {/* ===================================================================
            TAB 3: MANAGE SUPER ADMINS (Role: 'super_admin')
            =================================================================== */}
        {activeTab === 'super_admins' && (
          <div className="super-admin-team-section">
            {/* Active Super Administrators Table */}
            <section className="super-admin-table-card" style={{ marginBottom: '2rem' }}>
              <div className="table-card-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    Active Super Administrators
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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
                          <tr key={inv.id}>
                            <td>
                              <code style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{inv.email}</code>
                            </td>
                            <td>
                              {inv.invite_link ? (
                                <button
                                  type="button"
                                  className="btn-copy-link"
                                  onClick={() => handleCopyToClipboard(inv.invite_link, `inv_${inv.id}`)}
                                >
                                  {copiedKey === `inv_${inv.id}` ? '✓ Copied Link' : '📋 Copy Invite Link'}
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
                                <span className="status-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                                  <span className="status-dot" style={{ background: '#f59e0b' }}></span> PENDING (72H)
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
            MODAL 2: MANUAL CREATE FINANCE COMPANY + ADMIN
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
                      <span className="detail-label">Admin Full Name:</span>
                      <span className="detail-val">{createdCompanyResult.admin.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Admin Login Email:</span>
                      <span className="detail-val"><code>{createdCompanyResult.admin.email}</code></span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Temporary Password:</span>
                      <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>
                          {createdCompanyResult.temporary_password}
                        </code>
                        <button
                          type="button"
                          className="btn-copy-small"
                          onClick={() => handleCopyToClipboard(createdCompanyResult.temporary_password, 'comp_pwd')}
                        >
                          {copiedKey === 'comp_pwd' ? '✓' : 'Copy'}
                        </button>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Merchant Apply URL:</span>
                      <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '0.8rem' }}>{createdCompanyResult.apply_url}</code>
                        <button
                          type="button"
                          className="btn-copy-small"
                          onClick={() => handleCopyToClipboard(createdCompanyResult.apply_url, 'comp_url')}
                        >
                          {copiedKey === 'comp_url' ? '✓' : 'Copy'}
                        </button>
                      </span>
                    </div>
                  </div>

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
                /* Form View */
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

                    {/* Password Mode Toggle */}
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Administrator Password Provisioning
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="createPasswordMode"
                            checked={createPasswordMode === 'auto'}
                            onChange={() => setCreatePasswordMode('auto')}
                          />
                          ⚡ Auto-generate secure temporary password (Recommended)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="createPasswordMode"
                            checked={createPasswordMode === 'manual'}
                            onChange={() => setCreatePasswordMode('manual')}
                          />
                          🔑 Set custom password
                        </label>
                      </div>

                      {createPasswordMode === 'manual' && (
                        <div className="password-input-wrapper" style={{ marginTop: '0.5rem' }}>
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            className="modal-text-input"
                            placeholder="Enter temporary password (min. 8 characters)"
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
                      {isCreatingCompany ? 'Provisioning...' : 'Create Company & Admin →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 3: CREATE COMPANY ADMIN (Role: 'admin')
            =================================================================== */}
        {showCreateAdminModal && (
          <div className="super-modal-backdrop" onClick={() => !isCreatingAdmin && handleCloseCreateAdminModal()}>
            <div className="super-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header" style={{ borderBottomColor: 'var(--border-card)' }}>
                <span style={{ fontSize: '2rem' }}>👤</span>
                <div className="super-modal-header-text">
                  <h3 style={{ color: 'var(--text-main)' }}>Create Finance Company Administrator</h3>
                  <p>Directly provision an Administrator for an existing registered finance company.</p>
                </div>
              </div>

              {createdAdminResult ? (
                /* Success View with Created Admin Credentials */
                <div className="super-modal-body">
                  <div className="super-modal-success-box">
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
                    <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>Admin Account Created!</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      Administrator <strong>{createdAdminResult.admin.name}</strong> has been provisioned for <strong>{createdAdminResult.company.name}</strong>.
                    </p>
                  </div>

                  <div className="super-modal-details-summary" style={{ marginTop: '1.25rem' }}>
                    <div className="detail-row">
                      <span className="detail-label">Assigned Company:</span>
                      <span className="detail-val">{createdAdminResult.company.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Admin Full Name:</span>
                      <span className="detail-val">{createdAdminResult.admin.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Login Email:</span>
                      <span className="detail-val"><code>{createdAdminResult.admin.email}</code></span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Temporary Password:</span>
                      <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px' }}>
                          {createdAdminResult.temporary_password}
                        </code>
                        <button
                          type="button"
                          className="btn-copy-small"
                          onClick={() => handleCopyToClipboard(createdAdminResult.temporary_password, 'admin_pwd')}
                        >
                          {copiedKey === 'admin_pwd' ? '✓' : 'Copy'}
                        </button>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Merchant Gateway Link:</span>
                      <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{ fontSize: '0.8rem' }}>{createdAdminResult.apply_url}</code>
                        <button
                          type="button"
                          className="btn-copy-small"
                          onClick={() => handleCopyToClipboard(createdAdminResult.apply_url, 'admin_url')}
                        >
                          {copiedKey === 'admin_url' ? '✓' : 'Copy'}
                        </button>
                      </span>
                    </div>
                  </div>

                  <div className="super-modal-footer" style={{ marginTop: '1.5rem', padding: 0, border: 'none' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleCloseCreateAdminModal}
                    >
                      Done & Return to Console
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleCreateAdminSubmit}>
                  <div className="super-modal-body">
                    {createAdminError && (
                      <div className="super-admin-alert error" style={{ marginBottom: '1rem' }}>
                        <span>⚠️ {createAdminError}</span>
                      </div>
                    )}

                    {/* Company Dropdown */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Target Finance Company / Institution *
                      </label>
                      <select
                        className="modal-text-input"
                        value={newAdminCompanyId}
                        onChange={(e) => setNewAdminCompanyId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Finance Company --</option>
                        {activeCompaniesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (/{c.slug})
                          </option>
                        ))}
                      </select>
                      {activeCompaniesList.length === 0 && (
                        <span style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                          No active finance companies registered. Please create a company first.
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                          Admin Full Name *
                        </label>
                        <input
                          type="text"
                          className="modal-text-input"
                          placeholder="e.g. Priya Sharma"
                          value={newAdminName}
                          onChange={(e) => setNewAdminName(e.target.value)}
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
                          placeholder="priya@company.com"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Mode Toggle */}
                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Administrator Password Provisioning
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="newAdminPasswordMode"
                            checked={newAdminPasswordMode === 'auto'}
                            onChange={() => setNewAdminPasswordMode('auto')}
                          />
                          ⚡ Auto-generate secure temporary password (Recommended)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="newAdminPasswordMode"
                            checked={newAdminPasswordMode === 'manual'}
                            onChange={() => setNewAdminPasswordMode('manual')}
                          />
                          🔑 Set custom password
                        </label>
                      </div>

                      {newAdminPasswordMode === 'manual' && (
                        <div className="password-input-wrapper" style={{ marginTop: '0.5rem' }}>
                          <input
                            type={showNewAdminPassword ? 'text' : 'password'}
                            className="modal-text-input"
                            placeholder="Enter temporary password (min. 8 characters)"
                            value={newAdminCustomPassword}
                            onChange={(e) => setNewAdminCustomPassword(e.target.value)}
                            required={newAdminPasswordMode === 'manual'}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                          >
                            {showNewAdminPassword ? '👁️' : '🔒'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="super-modal-footer">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCloseCreateAdminModal}
                      disabled={isCreatingAdmin}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary btn-purple"
                      disabled={isCreatingAdmin || !newAdminCompanyId}
                    >
                      {isCreatingAdmin ? 'Creating Administrator...' : 'Create Admin Account →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 4: REVOKE COMPANY ADMIN CONFIRMATION
            =================================================================== */}
        {adminToRevoke && (
          <div className="super-modal-backdrop" onClick={() => !isRevokingAdmin && setAdminToRevoke(null)}>
            <div className="super-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header">
                <span className="super-modal-warning-icon">⚠️</span>
                <div className="super-modal-header-text">
                  <h3>Revoke Administrator Access</h3>
                  <p>You are about to revoke company-level administrative access.</p>
                </div>
              </div>

              <div className="super-modal-body">
                <div className="super-modal-warning-box">
                  <strong>Are you sure you want to revoke admin access for {adminToRevoke.name}?</strong>
                  <br /><br />
                  This user will no longer be able to log in or manage underwriters for <strong>{adminToRevoke.company_name}</strong>.
                </div>

                <div className="super-modal-details-summary">
                  <div className="detail-row">
                    <span className="detail-label">Admin Name:</span>
                    <span className="detail-val">{adminToRevoke.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email Address:</span>
                    <span className="detail-val"><code>{adminToRevoke.email}</code></span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Finance Company:</span>
                    <span className="detail-val">{adminToRevoke.company_name}</span>
                  </div>
                </div>
              </div>

              <div className="super-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAdminToRevoke(null)}
                  disabled={isRevokingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger-confirm"
                  onClick={handleConfirmRevokeAdmin}
                  disabled={isRevokingAdmin}
                >
                  {isRevokingAdmin ? 'Revoking...' : 'Revoke Admin Access'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODAL 5: INVITE SUPER ADMIN
            =================================================================== */}
        {showInviteAdminModal && (
          <div className="super-modal-backdrop" onClick={() => !isSendingInvite && handleCloseInviteAdminModal()}>
            <div className="super-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
              <div className="super-modal-header" style={{ borderBottomColor: 'var(--border-card)' }}>
                <span style={{ fontSize: '2rem' }}>🛡️</span>
                <div className="super-modal-header-text">
                  <h3 style={{ color: 'var(--text-main)' }}>Invite Platform Super Admin</h3>
                  <p>Grant full platform administration access with high security authorization.</p>
                </div>
              </div>

              {createdInviteResult ? (
                /* Success View with Direct Share Link */
                <div className="super-modal-body">
                  <div className="super-modal-success-box">
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎉</span>
                    <h3 style={{ color: '#10b981', margin: '0 0 0.5rem 0' }}>Super Admin Invite Issued!</h3>
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
