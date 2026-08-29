import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyApplications, fetchApplications } from '../api/applicationApi';

export default function Dashboard() {
  const { user } = useAuth();
  const isMerchant = !user?.role || user.role === 'merchant';

  if (!isMerchant) {
    return <ReviewerDashboard user={user} />;
  }

  return <MerchantDashboard user={user} />;
}

/**
 * Reviewer Queue Dashboard (For roles: underwriter, admin, risk_officer)
 */
function ReviewerDashboard({ user }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending_review'); // Default actionable queue
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting state
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplications({
        status: statusFilter,
        search: searchQuery
      });
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load reviewer queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter, searchQuery]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Sorted Applications Array
  const sortedApplications = [...applications].sort((a, b) => {
    let valA, valB;
    if (sortField === 'riskScore') {
      valA = a.risk_result?.riskScore ?? a.riskScore ?? -1;
      valB = b.risk_result?.riskScore ?? b.riskScore ?? -1;
    } else {
      // Default created_at
      valA = new Date(a.created_at || 0).getTime();
      valB = new Date(b.created_at || 0).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

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

  // Counts for top metrics bar
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => (a.status || '').toLowerCase() === 'pending_review').length;
  const adversarialCount = applications.filter(a => a.adversarial_result?.adversarialFlag === true).length;
  const closedCount = applications.filter(a => (a.status || '').toLowerCase() === 'closed').length;

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <div className="merchant-welcome-tag" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
            Underwriter & Risk Portal
          </div>
          <h1 className="dashboard-title">Underwriting Review Queue</h1>
          <p className="dashboard-subtitle">
            Autonomous multi-agent risk evaluation queue and decision verification.
          </p>
        </div>
      </div>

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
        {/* Toolbar & Filters */}
        <div className="card-toolbar">
          <div className="filter-group">
            <span className="filter-label">Queue View:</span>
            <button
              className={`filter-btn ${statusFilter === 'pending_review' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending_review')}
            >
              Pending Review ({pendingCount})
            </button>
            <button
              className={`filter-btn ${statusFilter === 'closed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('closed')}
            >
              Closed
            </button>
            <button
              className={`filter-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Queue
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by ID or business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-spinner-container">
            <div className="spinner"></div>
            <p>Loading reviewer queue...</p>
          </div>
        ) : sortedApplications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <h3>No Applications in Queue</h3>
            <p>No applications match the selected status filter.</p>
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
                    onClick={() => toggleSort('riskScore')}
                    title="Click to sort by Risk Score"
                  >
                    Risk Score {sortField === 'riskScore' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                  </th>
                  <th>Confidence</th>
                  <th>Adversarial Risk Flag</th>
                  <th>Pipeline Verdict</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedApplications.map((app) => {
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
                          <span className="cat-tag">{app.merchant_data?.business_category || 'General'}</span>
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
