import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyApplications, fetchApplications } from '../api/applicationApi';
import TeamManagement from '../components/TeamManagement';
import CompanyAnalytics from '../components/CompanyAnalytics';
import CompanySettings from '../components/CompanySettings';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error Caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#1e1e2e', color: '#ff5555', borderRadius: '8px', margin: '2rem' }}>
          <h2>Dashboard Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#fff' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const { user, company } = useAuth();
  const isMerchant = !user?.role || user.role === 'merchant';

  return (
    <ErrorBoundary>
      {!isMerchant ? (
        <ReviewerDashboard user={user} company={company} />
      ) : (
        <MerchantDashboard user={user} />
      )}
    </ErrorBoundary>
  );
}

/**
 * Reviewer Queue Dashboard (For roles: underwriter, admin, risk_officer)
 */
function ReviewerDashboard({ user, company }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    ['analytics', 'team', 'settings'].includes(tabParam) ? tabParam : 'queue'
  );
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & Search & Sort Controls State
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'pending' | 'approved' | 'rejected' | 'manual_review'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'risk_desc' | 'risk_asc'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tabParam && ['queue', 'analytics', 'team', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams(newTab === 'queue' ? {} : { tab: newTab });
  };

  const handleCopyLink = () => {
    const link = company?.apply_link || `${window.location.origin}/apply/${company?.slug || 'verdika-capital'}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all company applications so client-side searching/filtering/sorting is instant
      const data = await fetchApplications({ status: 'ALL' });
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load reviewer queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSortBy('date_desc');
  };

  const toggleHeaderSort = (field) => {
    if (field === 'riskScore') {
      setSortBy(prev => (prev === 'risk_desc' ? 'risk_asc' : 'risk_desc'));
    } else if (field === 'created_at') {
      setSortBy(prev => (prev === 'date_desc' ? 'date_asc' : 'date_desc'));
    }
  };

  // -------------------------------------------------------------
  // Combined Search, Status Filter & Sorting Logic
  // -------------------------------------------------------------
  const filteredAndSortedApplications = useMemo(() => {
    let list = [...applications];

    // 1. Status Filter
    if (statusFilter !== 'ALL') {
      list = list.filter((app) => {
        const revDec = (app.reviewer_decision || '').toLowerCase();
        const dec = (app.decision || '').toLowerCase();
        const status = (app.status || '').toLowerCase();

        if (statusFilter === 'pending') {
          return status === 'pending_review' || (status !== 'closed' && !revDec);
        }
        if (statusFilter === 'approved') {
          return revDec === 'approved' || dec === 'auto_approve';
        }
        if (statusFilter === 'rejected') {
          return revDec === 'rejected' || dec === 'auto_reject';
        }
        if (statusFilter === 'manual_review') {
          return dec === 'route_to_human' || status === 'pending_review' || revDec === 'manual_review';
        }
        if (statusFilter === 'closed') {
          return status === 'closed';
        }
        return true;
      });
    }

    // 2. Search Query (business name, GSTIN, App ID, category, applicant email)
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((app) => {
        const businessName = (
          app.merchant_data?.business_name ||
          app.merchant_data?.businessName ||
          app.business_name ||
          ''
        ).toLowerCase();
        const gstin = (app.merchant_data?.gstin || app.gstin || '').toLowerCase();
        const appId = (app.id || '').toLowerCase();
        const email = (
          app.merchant_data?.applicant_email ||
          app.merchant_data?.email ||
          ''
        ).toLowerCase();
        const category = (app.merchant_data?.business_category || '').toLowerCase();

        return (
          businessName.includes(query) ||
          gstin.includes(query) ||
          appId.includes(query) ||
          email.includes(query) ||
          category.includes(query)
        );
      });
    }

    // 3. Multi-Attribute Sorting
    list.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      const riskObjA = typeof a.risk_result === 'object' && a.risk_result ? a.risk_result : {};
      const riskObjB = typeof b.risk_result === 'object' && b.risk_result ? b.risk_result : {};
      const riskA = riskObjA.riskScore ?? a.riskScore ?? 0;
      const riskB = riskObjB.riskScore ?? b.riskScore ?? 0;

      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'risk_desc') return riskB - riskA;
      if (sortBy === 'risk_asc') return riskA - riskB;
      // Default: date_desc (newest first)
      return dateB - dateA;
    });

    return list;
  }, [applications, statusFilter, searchQuery, sortBy]);

  // Dynamic counts for summary chips
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => (a.status || '').toLowerCase() === 'pending_review' || !a.reviewer_decision).length;
  const approvedCount = applications.filter(a => a.reviewer_decision === 'approved' || a.decision === 'auto_approve').length;
  const rejectedCount = applications.filter(a => a.reviewer_decision === 'rejected' || a.decision === 'auto_reject').length;
  const adversarialCount = applications.filter(a => a.adversarial_result?.adversarialFlag === true).length;
  const closedCount = applications.filter(a => (a.status || '').toLowerCase() === 'closed').length;

  const getStatusBadge = (app) => {
    const st = app.status ? app.status.toLowerCase() : '';
    const dec = app.decision ? app.decision.toLowerCase() : '';

    if (st === 'closed') {
      return (
        <span className="badge badge-approved">
          <span className="badge-dot dot-approved"></span> Closed
        </span>
      );
    }
    return (
      <span className="badge badge-review">
        <span className="badge-dot dot-review"></span> Pending Review
      </span>
    );
  };

  const getDecisionBadge = (app) => {
    const dec = app.decision ? app.decision.toLowerCase() : '';
    const revDec = app.reviewer_decision ? app.reviewer_decision.toLowerCase() : '';

    if (revDec === 'approved' || dec === 'auto_approve') {
      return <span className="text-emerald font-semibold">Auto Approved</span>;
    }
    if (revDec === 'rejected' || dec === 'auto_reject') {
      return <span className="text-rose font-semibold">Auto Declined</span>;
    }
    if (dec === 'route_to_human') {
      return <span className="text-amber font-semibold">Route to Human</span>;
    }
    return <span className="text-muted font-semibold">Pending</span>;
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="merchant-welcome-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
            Underwriter & Risk Portal
          </div>
          <h1 className="dashboard-title">
            {activeTab === 'analytics'
              ? 'Portfolio Analytics & Underwriting Performance'
              : activeTab === 'team'
              ? 'Team & Underwriter Management'
              : 'Underwriting Review Queue'}
          </h1>
          <p className="dashboard-subtitle">
            {activeTab === 'analytics'
              ? 'Real-time approval rates, risk tier histograms, turnaround metrics, and company pipeline intelligence.'
              : activeTab === 'team'
              ? 'Manage authorized underwriters and generate secure invite links for your company.'
              : 'Autonomous multi-agent risk evaluation queue and decision verification.'}
          </p>
        </div>

        {/* Dashboard Section Switcher Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '4px', gap: '4px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`filter-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => handleTabChange('queue')}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px' }}
          >
            📋 Review Queue ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px' }}
          >
            📊 Analytics & Insights
          </button>
          <button
            type="button"
            className={`filter-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => handleTabChange('team')}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px' }}
          >
            👥 Team & Invites
          </button>
          {user?.role === 'admin' && (
            <button
              type="button"
              id="company-settings-tab-btn"
              className={`filter-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleTabChange('settings')}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px' }}
            >
              ⚙️ Company Settings
            </button>
          )}
        </div>
      </div>

      {/* Finance Company Multi-Tenant Public Link Banner */}
      {company && (
        <div className="company-link-banner">
          <div className="company-link-info">
            <div className="company-link-title-row">
              <span style={{ fontSize: '1.15rem' }}>🏦</span>
              <span className="company-link-name">
                {company.name}
              </span>
              <span className="badge badge-approved" style={{ fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Private Tenant
              </span>
            </div>
            <p className="company-link-desc">
              Share this dedicated link with merchant applicants. All submissions are automatically tagged and isolated to your company's review queue.
            </p>
            <div className="company-link-url-box">
              <span className="company-link-url-label">Public Merchant Link:</span>
              <code className="company-link-url-code">
                {company.apply_link || `${window.location.origin}/apply/${company.slug}`}
              </code>
            </div>
          </div>

          <div className="company-link-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleCopyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Link'}</span>
            </button>
            <a
              href={`/apply/${company.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}
            >
              <span>↗ Open Gateway</span>
            </a>
          </div>
        </div>
      )}

      {activeTab === 'analytics' ? (
        <CompanyAnalytics
          applications={applications}
          company={company}
          loading={loading}
        />
      ) : activeTab === 'team' ? (
        <TeamManagement user={user} company={company} />
      ) : activeTab === 'settings' ? (
        <CompanySettings user={user} company={company} />
      ) : (
        <>
          {/* Metrics Row */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Actionable Queue</div>
              <div className="stat-value text-amber">{pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Adversarial Flagged</div>
              <div className="stat-value text-rose">{adversarialCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Closed Applications</div>
              <div className="stat-value text-emerald">{closedCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Filtered Results</div>
              <div className="stat-value">{totalCount}</div>
            </div>
          </div>

          {/* Main Reviewer Table Card */}
          <div className="dashboard-card">
            {/* Search, Filter & Sort Controls Panel */}
            <div className="queue-controls-panel">
              {/* 1. Search bar at the top */}
              <div className="queue-search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by business name, GSTIN, or Application ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="queue-search-input"
                  id="queue-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 2. Filter & Sort Dropdowns Row */}
              <div className="queue-dropdowns-row">
                {/* Status Filter Dropdown */}
                <div className="control-group">
                  <label className="control-label" htmlFor="status-filter-select">
                    Filter by Status:
                  </label>
                  <select
                    id="status-filter-select"
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses ({applications.length})</option>
                    <option value="pending">Pending Review ({pendingCount})</option>
                    <option value="approved">Approved ({approvedCount})</option>
                    <option value="rejected">Rejected ({rejectedCount})</option>
                    <option value="manual_review">Manual Review Flagged</option>
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="control-group">
                  <label className="control-label" htmlFor="sort-select">
                    Sort by:
                  </label>
                  <select
                    id="sort-select"
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date_desc">📅 Date: Newest First</option>
                    <option value="date_asc">📅 Date: Oldest First</option>
                    <option value="risk_desc">⚠️ Risk Score: Highest First</option>
                    <option value="risk_asc">🛡️ Risk Score: Lowest First</option>
                  </select>
                </div>

                {/* Active filter counter & Reset button */}
                {(searchQuery || statusFilter !== 'ALL' || sortBy !== 'date_desc') && (
                  <button
                    type="button"
                    className="btn-reset-filters"
                    onClick={handleResetFilters}
                    title="Reset all search & filter controls"
                  >
                    ↺ Reset Filters
                  </button>
                )}

                <div className="queue-results-counter">
                  Showing <strong>{filteredAndSortedApplications.length}</strong> of {applications.length} applications
                </div>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
              <div className="loading-spinner-container">
                <div className="spinner"></div>
                <p>Loading reviewer queue...</p>
              </div>
            ) : filteredAndSortedApplications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No applications match your filters</h3>
                <p>
                  No applications match the current combination of search keywords and status filters.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleResetFilters}
                  style={{ display: 'inline-flex', marginTop: '1rem', padding: '0.5rem 1.25rem' }}
                >
                  ↺ Reset All Filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="app-table reviewer-table">
                  <thead>
                    <tr>
                      <th>App ID</th>
                      <th>Merchant Name</th>
                      <th
                        className="sortable-header"
                        onClick={() => toggleHeaderSort('riskScore')}
                        title="Click to sort by Risk Score"
                      >
                        Risk Score {sortBy === 'risk_desc' ? '▼' : sortBy === 'risk_asc' ? '▲' : '⇅'}
                      </th>
                      <th>Confidence</th>
                      <th>Adversarial Risk Flag</th>
                      <th>Pipeline Verdict</th>
                      <th>Status</th>
                      <th
                        className="sortable-header"
                        onClick={() => toggleHeaderSort('created_at')}
                        title="Click to sort by Submission Date"
                      >
                        Submitted {sortBy === 'date_desc' ? '▼' : sortBy === 'date_asc' ? '▲' : '⇅'}
                      </th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedApplications.map((app) => {
                      const riskObj = typeof app.risk_result === 'string'
                        ? (() => { try { return JSON.parse(app.risk_result); } catch { return {}; } })()
                        : (app.risk_result || {});

                      const riskScore = riskObj.riskScore ?? app.riskScore ?? null;
                      const confidence = riskObj.confidence ?? app.confidence ?? null;

                      const advObj = typeof app.adversarial_result === 'string'
                        ? (() => { try { return JSON.parse(app.adversarial_result); } catch { return {}; } })()
                        : (app.adversarial_result || {});

                      const isAdversarial = Boolean(advObj && advObj.adversarialFlag === true);
                      const patterns = Array.isArray(advObj?.detectedPatterns) ? advObj.detectedPatterns : [];

                      return (
                        <tr
                          key={app.id}
                          className="reviewer-row"
                          onClick={() => navigate(`/dashboard/application/${app.id}`)}
                        >
                          <td>
                            <span className="app-id">{app.id}</span>
                          </td>
                          <td>
                            <div className="merchant-name-cell">
                              <span className="font-semibold">{app.merchant_data?.business_name || 'Unknown Merchant'}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className="cat-tag">{app.merchant_data?.business_category || 'General'}</span>
                                {app.merchant_data?.loan_amount && (
                                  <span className="badge" style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)', fontWeight: 700 }}>
                                    ₹{Number(app.merchant_data.loan_amount).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {riskScore !== null ? (
                              <div className="risk-score-pill">
                                <span className={`risk-val ${riskScore > 0.6 ? 'text-rose' : riskScore > 0.3 ? 'text-amber' : 'text-emerald'}`}>
                                  {(riskScore * 100).toFixed(0)}%
                                </span>
                                <div className="risk-bar-track">
                                  <div
                                    className={`risk-bar-fill ${riskScore > 0.6 ? 'bg-rose' : riskScore > 0.3 ? 'bg-amber' : 'bg-emerald'}`}
                                    style={{ width: `${Math.min(100, Math.max(5, riskScore * 100))}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            {confidence !== null ? (
                              <span className="conf-pill">{(confidence * 100).toFixed(0)}%</span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>
                            {/* DISTINCT ADVERSARIAL RISK BADGE */}
                            {isAdversarial ? (
                              <div className="adversarial-indicator-flag">
                                <span className="adv-icon">🚨</span>
                                <div>
                                  <div>ADVERSARIAL FLAG</div>
                                  {patterns.length > 0 && (
                                    <div className="adv-subtext">
                                      {patterns.map(p => p.pattern || p).join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="clean-indicator">✓ Clean</span>
                            )}
                          </td>
                          <td>{getDecisionBadge(app)}</td>
                          <td>{getStatusBadge(app)}</td>
                          <td className="text-muted">{formatDate(app.created_at)}</td>
                          <td>
                            <button
                              className="inspect-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/application/${app.id}`);
                              }}
                            >
                              Review →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Merchant Portal Dashboard
 */
function MerchantDashboard({ user }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyApplications({ status: statusFilter });
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load application history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const getStatusBadge = (app) => {
    const dec = app.decision ? app.decision.toLowerCase() : '';
    const st = app.status ? app.status.toLowerCase() : '';

    if (dec === 'auto_approve' || dec === 'approved') {
      return (
        <span className="badge badge-approved">
          <span className="badge-dot dot-approved"></span> Approved
        </span>
      );
    }
    if (dec === 'auto_reject' || dec === 'rejected') {
      return (
        <span className="badge badge-rejected">
          <span className="badge-dot dot-rejected"></span> Declined
        </span>
      );
    }
    if (st === 'pending_review' || dec === 'route_to_human') {
      return (
        <span className="badge badge-review">
          <span className="badge-dot dot-review"></span> Under Review
        </span>
      );
    }
    return (
      <span className="badge badge-review">
        <span className="badge-dot dot-review"></span> {app.status || 'Pending'}
      </span>
    );
  };

  const getDecisionText = (app) => {
    const dec = app.decision ? app.decision.toLowerCase() : '';
    if (dec === 'auto_approve') return 'Auto Approved';
    if (dec === 'auto_reject') return 'Auto Declined';
    if (dec === 'route_to_human' || app.status === 'pending_review') return 'Under Review';
    if (dec === 'approved') return 'Approved';
    if (dec === 'rejected') return 'Declined';
    return 'Under Review';
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div>
          <div className="merchant-welcome-tag">Merchant Portal</div>
          <h1 className="dashboard-title">Welcome, {user?.name || user?.email?.split('@')[0] || 'Merchant'}</h1>
          <p className="dashboard-subtitle">
            Track your credit application status and submit business underwriting requests.
          </p>
        </div>

        <Link to="/apply" className="new-app-btn">
          <span className="btn-icon">+</span> New Application
        </Link>
      </div>

      {/* Quick Stats Bar */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Applications</div>
          <div className="stat-value">{applications.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value text-emerald">
            {applications.filter(a => a.decision === 'auto_approve' || a.decision === 'approved').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Under Review</div>
          <div className="stat-value text-amber">
            {applications.filter(a => a.status === 'pending_review' || a.decision === 'route_to_human').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Declined</div>
          <div className="stat-value text-rose">
            {applications.filter(a => a.decision === 'auto_reject' || a.decision === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="dashboard-card">
        <div className="card-toolbar">
          <h2 className="card-title">Application History</h2>

          <div className="filter-group">
            <span className="filter-label">Filter:</span>
            <button
              className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All
            </button>
            <button
              className={`filter-btn ${statusFilter === 'pending_review' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending_review')}
            >
              Under Review
            </button>
            <button
              className={`filter-btn ${statusFilter === 'closed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('closed')}
            >
              Closed
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-spinner-container">
            <div className="spinner"></div>
            <p>Loading application history...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No Applications Found</h3>
            <p>You haven't submitted any underwriting applications yet.</p>
            <Link to="/apply" className="new-app-btn" style={{ display: 'inline-flex', marginTop: '1rem' }}>
              Submit First Application
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Business Name</th>
                  <th>Submitted Date</th>
                  <th>Decision</th>
                  <th>Status</th>
                  <th>Applicant Note</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span className="app-id">{app.id}</span>
                    </td>
                    <td className="font-semibold">{app.business_name || 'N/A'}</td>
                    <td className="text-muted">{formatDate(app.created_at)}</td>
                    <td>
                      <span className="decision-label">{getDecisionText(app)}</span>
                    </td>
                    <td>{getStatusBadge(app)}</td>
                    <td className="text-truncate">
                      {app.applicant_message ? app.applicant_message : 'Evaluation completed.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
