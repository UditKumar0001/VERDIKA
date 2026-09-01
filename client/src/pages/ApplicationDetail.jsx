import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApplicationById, submitReviewDecision, requestApplicationInfo } from '../api/applicationApi';
import { generateUnderwritingReportPDF } from '../utils/pdfGenerator';
import RiskExplainabilityChart from '../components/RiskExplainabilityChart';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [application, setApplication] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Tab Navigation: 'overview' | 'timeline' | 'documents'
  const [activeTab, setActiveTab] = useState('overview');

  // Timeline Filtering & Sorting
  const [timelineFilter, setTimelineFilter] = useState('all'); // 'all' | 'reviewer' | 'agents'
  const [timelineSort, setTimelineSort] = useState('desc'); // 'desc' (newest first) | 'asc' (oldest first)

  // Information Request Form State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('KYC & Document Clarification');
  const [requestNotes, setRequestNotes] = useState('');
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState({ type: '', text: '' });

  // Form state for reviewer decision
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplicationById(id);
      setApplication(data.application);
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const handleReviewSubmit = async (decisionType) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await submitReviewDecision(id, {
        decision: decisionType,
        notes
      });
      setApplication(res.application);
      setAuditLogs(res.auditLogs || []);
    } catch (err) {
      setActionError(err.message || `Failed to submit ${decisionType} decision.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestInfoSubmit = async (e) => {
    e.preventDefault();
    setIsRequestingInfo(true);
    setRequestFeedback({ type: '', text: '' });

    try {
      const res = await requestApplicationInfo(id, {
        request_type: requestType,
        notes: requestNotes
      });
      setAuditLogs(res.auditLogs || []);
      setRequestFeedback({ type: 'success', text: 'Information request recorded to activity timeline.' });
      setRequestNotes('');
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestFeedback({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setRequestFeedback({ type: 'error', text: err.message || 'Failed to record information request.' });
    } finally {
      setIsRequestingInfo(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      setGeneratingPdf(true);
      generateUnderwritingReportPDF(application, auditLogs);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      setTimeout(() => setGeneratingPdf(false), 500);
    }
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

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  // Classify and process audit logs
  const processedLogs = useMemo(() => {
    return auditLogs.map(log => {
      const isHuman = (log.actor && log.actor !== 'system') || (log.agent_name || log.agentName) === 'HumanReviewer' || (log.agent_name || log.agentName) === 'ReviewerAction' || (log.agent_name || log.agentName) === 'ReviewerActivity';
      const isView = (log.agent_name || log.agentName) === 'ReviewerActivity' || (log.summary || '').toLowerCase().includes('viewed and inspected');
      const isInfoRequest = (log.agent_name || log.agentName) === 'ReviewerAction' || (log.summary || '').toLowerCase().includes('information request');
      const isDecision = (log.agent_name || log.agentName) === 'HumanReviewer' || (log.summary || '').toLowerCase().includes('decision rendered');
      const isAgent = !isHuman;

      let icon = '🤖';
      let dotClass = 'dot-agent';
      let badgeClass = 'badge-agent';
      let actorLabel = log.agent_name || log.agentName || 'Autonomous Agent';

      if (isDecision) {
        icon = '✍️';
        dotClass = 'dot-action';
        badgeClass = 'badge-human';
        actorLabel = `Reviewer: ${log.actor || 'Underwriter'}`;
      } else if (isInfoRequest) {
        icon = '📝';
        dotClass = 'dot-request';
        badgeClass = 'badge-human';
        actorLabel = `Reviewer: ${log.actor || 'Underwriter'}`;
      } else if (isView) {
        icon = '👁️';
        dotClass = 'dot-view';
        badgeClass = 'badge-view';
        actorLabel = `Reviewer: ${log.actor || 'Underwriter'}`;
      } else if (isHuman) {
        icon = '👤';
        dotClass = 'dot-human';
        badgeClass = 'badge-human';
        actorLabel = `Reviewer: ${log.actor || 'Underwriter'}`;
      } else {
        actorLabel = `${log.agent_name || log.agentName || 'PipelineAgent'} (Autonomous Engine)`;
      }

      return {
        ...log,
        icon,
        dotClass,
        badgeClass,
        actorLabel,
        isHuman,
        isAgent,
        isView,
        isInfoRequest,
        isDecision
      };
    });
  }, [auditLogs]);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    let result = [...processedLogs];

    if (timelineFilter === 'reviewer') {
      result = result.filter(l => l.isHuman || l.isView || l.isInfoRequest || l.isDecision);
    } else if (timelineFilter === 'agents') {
      result = result.filter(l => l.isAgent);
    }

    result.sort((a, b) => {
      const timeA = new Date(a.created_at || a.createdAt).getTime();
      const timeB = new Date(b.created_at || b.createdAt).getTime();
      return timelineSort === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [processedLogs, timelineFilter, timelineSort]);

  const reviewerCount = useMemo(() => processedLogs.filter(l => l.isHuman || l.isView || l.isInfoRequest || l.isDecision).length, [processedLogs]);
  const agentCount = useMemo(() => processedLogs.filter(l => l.isAgent).length, [processedLogs]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner-container" style={{ padding: '5rem 1rem' }}>
          <div className="spinner"></div>
          <p>Loading application evaluation details...</p>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="dashboard-container">
        <Link to="/dashboard" className="back-link">← Back to Queue</Link>
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error || 'Application not found.'}
        </div>
      </div>
    );
  }

  // Parse JSON properties if stored as strings
  const merchantData = typeof application.merchant_data === 'string'
    ? (() => { try { return JSON.parse(application.merchant_data); } catch { return {}; } })()
    : (application.merchant_data || {});

  const riskObj = typeof application.risk_result === 'string'
    ? (() => { try { return JSON.parse(application.risk_result); } catch { return {}; } })()
    : (application.risk_result || {});

  const advObj = typeof application.adversarial_result === 'string'
    ? (() => { try { return JSON.parse(application.adversarial_result); } catch { return {}; } })()
    : (application.adversarial_result || {});

  const riskScore = riskObj.riskScore ?? application.riskScore ?? null;
  const confidence = riskObj.confidence ?? application.confidence ?? null;
  const reasonCodes = Array.isArray(riskObj.reasonCodes) ? riskObj.reasonCodes : [];

  const isAdversarial = Boolean(advObj && advObj.adversarialFlag === true);
  const detectedPatterns = Array.isArray(advObj?.detectedPatterns) ? advObj.detectedPatterns : [];

  const isPending = (application.status || '').toLowerCase() === 'pending_review';
  const isClosed = (application.status || '').toLowerCase() === 'closed';

  const loanAmount = Number(merchantData.loan_amount || application.loan_amount || 500000);
  const loanTenure = Number(merchantData.loan_tenure_months || application.loan_tenure_months || 12);
  const emiData = (() => {
    const P = loanAmount;
    const n = loanTenure;
    if (P <= 0 || n <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 };
    const r = (14 / 12) / 100;
    const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const totalPayable = emi * n;
    const totalInterest = Math.max(0, totalPayable - P);
    return { emi, totalPayable, totalInterest };
  })();

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <Link to="/dashboard" className="back-link">
            ← Back to Review Queue
          </Link>
          <h1 className="dashboard-title">{merchantData.business_name || 'Application Detail'}</h1>
          <p className="dashboard-subtitle">
            Reference ID: <span className="font-mono text-cyan">{application.id}</span> &bull; Submitted {formatDate(application.created_at)}
          </p>
        </div>

        <div className="header-actions-group">
          <button
            type="button"
            id="download-report-btn"
            className="btn-download-report"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            title="Download full underwriting assessment report as PDF"
          >
            <span className="btn-icon">📥</span>
            <span>{generatingPdf ? 'Generating PDF...' : 'Download Full Report (PDF)'}</span>
          </button>

          <div className="header-status-badge-container">
            {isClosed ? (
              <span className="badge badge-approved">
                <span className="badge-dot dot-approved"></span> Status: Closed
              </span>
            ) : (
              <span className="badge badge-review">
                <span className="badge-dot dot-review"></span> Status: Pending Review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Risk & Underwriting Overview
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          ⏱️ Activity Timeline ({auditLogs.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📑 Documents & Data
        </button>
      </div>

      {/* =========================================================================
          TAB 1: RISK & UNDERWRITING OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="detail-grid">
          {/* Left Column: Risk Engine & Adversarial Assessment */}
          <div className="detail-main-col">
            {/* Requested Loan Facility & Repayment Structure Card */}
            <div className="dashboard-card loan-summary-card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>💳 Requested Loan Facility & Terms</h2>
                <span className="emi-rate-badge">Interest Benchmark: 14% p.a.</span>
              </div>

              <div className="review-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="review-item">
                  <span className="review-item-label">Loan Facility Required</span>
                  <span className="review-item-val" style={{ color: '#10b981', fontWeight: 800, fontSize: '1.15rem' }}>
                    ₹{loanAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Preferred Tenure</span>
                  <span className="review-item-val">{loanTenure} Months ({loanTenure / 12} Yrs)</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Estimated Monthly Installment</span>
                  <span className="review-item-val" style={{ color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '1.15rem' }}>
                    ₹{emiData.emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)' }}> / mo</span>
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Total Repayable Facility</span>
                  <span className="review-item-val font-mono">₹{emiData.totalPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Top Stat Cards: Risk & Confidence */}
            <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="stat-card">
                <span className="stat-label">Model Risk Score</span>
                <div className="stat-value font-mono">
                  {riskScore !== null ? `${(riskScore * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <span className="stat-sub">
                  Threshold: &lt;25% Auto-Approve &bull; &gt;55% Reject
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Confidence Score</span>
                <div className="stat-value font-mono">
                  {confidence !== null ? `${Math.round(confidence * 100)}%` : 'N/A'}
                </div>
                <span className="stat-sub">
                  Based on transactional & KYC depth
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Adversarial Robustness</span>
                <div className="stat-value">
                  {isAdversarial ? (
                    <span className="text-red">Flagged</span>
                  ) : (
                    <span className="text-green">Clean</span>
                  )}
                </div>
                <span className="stat-sub">
                  {isAdversarial ? 'Anomalous manipulation pattern' : 'Natural velocity & mix'}
                </span>
              </div>
            </div>

            {/* Risk Explainability Horizontal Bar Chart */}
            <div style={{ marginBottom: '1.25rem' }}>
              <RiskExplainabilityChart
                application={application}
                reasonCodes={reasonCodes}
                riskScore={riskScore}
              />
            </div>

            {/* Adversarial Evaluation Card */}
            <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
              <div className="card-toolbar">
                <h2 className="card-title">🛡️ Adversarial Stress Test</h2>
                {isAdversarial ? (
                  <span className="badge badge-rejected">Adversarial Manipulation Detected</span>
                ) : (
                  <span className="badge badge-approved">Robust (Clean)</span>
                )}
              </div>

              {isAdversarial ? (
                <div className="adversarial-alert-box">
                  <p className="alert-title">⚠️ Gaming Patterns Detected</p>
                  <p className="alert-desc">
                    The AdversarialAgent detected signals consistent with synthetic volume inflation or transaction velocity gaming.
                  </p>
                  <ul className="patterns-list">
                    {detectedPatterns.map((pat, idx) => (
                      <li key={idx}><strong>{pat.pattern || 'Pattern'}:</strong> {pat.description}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted">
                  The AdversarialAgent evaluated transaction timestamps, order values, and cancellation clustering. No synthetic injection, circular transaction rings, or gaming patterns were detected.
                </p>
              )}
            </div>

            {/* KYC & Document Integrity Checklist */}
            <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
              <h2 className="card-title" style={{ marginBottom: '1rem' }}>
                📋 Document & KYC Integrity Checklist
              </h2>
              <div className="checklist-grid">
                {[
                  { key: 'gst_certificate', title: 'GST Registration Certificate', doc: merchantData.documents?.gst_certificate, required: true },
                  { key: 'pan_card', title: 'Permanent Account Number (PAN)', doc: merchantData.documents?.pan_card, required: true },
                  { key: 'bank_statement', title: 'Commercial Bank Statement (6 Months)', doc: merchantData.documents?.bank_statement, required: true },
                  { key: 'bank_details', title: 'Bank Settlement Account Details', doc: merchantData.bank_details ? { isUploaded: true, verified: true } : null, required: true }
                ].map(({ key, title, doc }) => {
                  let status = 'Missing';
                  let badgeClass = 'badge-doc-missing';
                  let iconClass = 'check-missing';
                  let iconSymbol = '✕';
                  let note = 'Document not provided by applicant';

                  if (doc && (doc.name || doc.verified || doc.isUploaded)) {
                    status = 'Clear';
                    badgeClass = 'badge-doc-clear';
                    iconClass = 'check-success';
                    iconSymbol = '✓';
                    note = doc.name ? `${doc.name}` : 'Verified & Readable';
                  }

                  return (
                    <div key={key} className="checklist-item">
                      <div className="checklist-status-icon">
                        <span className={iconClass}>{iconSymbol}</span>
                      </div>
                      <div className="checklist-info">
                        <div className="checklist-doc-title">
                          {title}
                          <span className={badgeClass}>{status}</span>
                        </div>
                        <div className="checklist-doc-sub">{note}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Underwriter Action Panel OR Closed Decision Summary */}
            {(() => {
              const merchantEmail = application?.merchant_data?.applicant_email || application?.merchant_data?.email || '';
              const isSelfApplication = Boolean(merchantEmail && user?.email && merchantEmail.toLowerCase() === user.email.toLowerCase()) || Boolean(application?.user_id && application?.user_id === user?.id);

              if (isPending && isSelfApplication && user?.role !== 'admin') {
                return (
                  <div
                    className="dashboard-card"
                    style={{
                      border: '1px solid var(--status-rejected)',
                      background: 'var(--status-rejected-bg)',
                      padding: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <span style={{ fontSize: '2.5rem' }}>🚫</span>
                    <div>
                      <h3 style={{ color: 'var(--status-rejected)', margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 800 }}>
                        Anti-Collusion Safety Lock Enforced
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
                        You cannot review or approve your own loan application (<strong style={{ color: 'var(--status-rejected)' }}>{merchantEmail}</strong>).
                      </p>
                    </div>
                  </div>
                );
              }

              if (isPending) {
                return (
                  <div className="dashboard-card action-panel-card">
                    <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>
                      ✍️ Underwriter Decision Action Panel
                    </h2>
                    <p className="dashboard-subtitle" style={{ marginBottom: '1.25rem' }}>
                      Review pipeline evaluation trace, input rationale, and confirm or override the final loan decision.
                    </p>

                    {actionError && <div className="alert alert-error">{actionError}</div>}

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label htmlFor="underwriter-notes" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                        Underwriter Rationale & Inspection Notes
                      </label>
                      <textarea
                        id="underwriter-notes"
                        rows="4"
                        placeholder="Add detailed reviewer notes (e.g. Verified merchant bank statements, confirmed low volatility baseline...)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="notes-textarea"
                      ></textarea>
                    </div>

                    <div className="decision-button-group">
                      <button
                        type="button"
                        className="btn-approve"
                        disabled={submitting}
                        onClick={() => handleReviewSubmit('approved')}
                      >
                        {submitting ? 'Submitting...' : '✓ Approve Application'}
                      </button>
                      <button
                        type="button"
                        className="btn-reject"
                        disabled={submitting}
                        onClick={() => handleReviewSubmit('rejected')}
                      >
                        {submitting ? 'Submitting...' : '✕ Decline Application'}
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            {!isPending && (
              <div className="dashboard-card closed-summary-card">
                <div className="closed-summary-header">
                  <div>
                    <span className="closed-tag">Review Complete</span>
                    <h3 className="closed-title">
                      Final Verdict: {application.reviewer_decision ? application.reviewer_decision.toUpperCase() : 'CLOSED'}
                    </h3>
                    <p className="closed-sub">
                      Application review completed by Underwriter <span className="font-semibold text-cyan">{application.reviewer_name || application.reviewer_id || 'Chief Underwriter'}</span> on {formatDate(application.updated_at)}
                    </p>
                  </div>
                </div>

                {notes && (
                  <div className="closed-notes-box">
                    <span className="notes-label">Underwriter Review Notes:</span>
                    <p className="notes-text">{notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Mini Audit Trail Timeline */}
          <div className="detail-side-col">
            <div className="dashboard-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  📜 Recent Activity
                </h2>
                <button
                  type="button"
                  className="btn-link"
                  style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setActiveTab('timeline')}
                >
                  View Full Timeline →
                </button>
              </div>

              <div className="timeline-container">
                {auditLogs.length === 0 ? (
                  <p className="text-muted">No activity logs recorded.</p>
                ) : (
                  auditLogs.slice(0, 5).map((log, idx) => {
                    const isHuman = (log.actor && log.actor !== 'system') || (log.agent_name || log.agentName) === 'HumanReviewer' || (log.agent_name || log.agentName) === 'ReviewerActivity' || (log.agent_name || log.agentName) === 'ReviewerAction';
                    const agentName = log.agent_name || log.agentName || 'Agent';

                    return (
                      <div
                        key={log.id || idx}
                        className={`timeline-item ${isHuman ? 'timeline-item-human' : 'timeline-item-system'}`}
                      >
                        <div className={`timeline-badge ${isHuman ? 'badge-human' : 'badge-system'}`}>
                          {isHuman ? '👤' : '⚙️'}
                        </div>

                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className={`timeline-agent-name ${isHuman ? 'text-indigo' : 'text-cyan'}`}>
                              {isHuman ? (log.actor || 'Underwriter') : `Agent: ${agentName}`}
                            </span>
                            <span className="timeline-time">{formatRelativeTime(log.created_at || log.createdAt)}</span>
                          </div>

                          <p className="timeline-summary">{log.summary || 'Step executed successfully.'}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DEDICATED ACTIVITY TIMELINE
          ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="activity-timeline-card">
          {/* Timeline Toolbar */}
          <div className="timeline-toolbar">
            <div className="timeline-filter-pills">
              <button
                type="button"
                className={`timeline-filter-btn ${timelineFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('all')}
              >
                All Events ({processedLogs.length})
              </button>
              <button
                type="button"
                className={`timeline-filter-btn ${timelineFilter === 'reviewer' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('reviewer')}
              >
                👤 Reviewer Actions ({reviewerCount})
              </button>
              <button
                type="button"
                className={`timeline-filter-btn ${timelineFilter === 'agents' ? 'active' : ''}`}
                onClick={() => setTimelineFilter('agents')}
              >
                🤖 Autonomous Agents ({agentCount})
              </button>
            </div>

            <div className="timeline-controls-right">
              <button
                type="button"
                className="timeline-sort-btn"
                onClick={() => setTimelineSort(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                title="Toggle chronological sorting"
              >
                {timelineSort === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
              </button>

              <button
                type="button"
                className="btn-request-info"
                onClick={() => setShowRequestModal(true)}
              >
                <span>📝</span>
                <span>Request Info / KYC</span>
              </button>
            </div>
          </div>

          {/* Request Information Inline Modal Box */}
          {showRequestModal && (
            <div className="request-info-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>
                  📝 Request Additional Documentation or Clarification
                </h3>
                <button
                  type="button"
                  className="btn-link"
                  style={{ color: 'var(--text-dim)', background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
                  onClick={() => setShowRequestModal(false)}
                >
                  ✕
                </button>
              </div>

              {requestFeedback.text && (
                <div className={requestFeedback.type === 'success' ? 'forgot-alert-success' : 'alert alert-error'} style={{ marginBottom: '1rem' }}>
                  {requestFeedback.text}
                </div>
              )}

              <form onSubmit={handleRequestInfoSubmit}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="request-type" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Request Category
                  </label>
                  <select
                    id="request-type"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', width: '100%' }}
                  >
                    <option value="KYC & Document Clarification">KYC & Document Clarification</option>
                    <option value="Updated Bank Statement Request">Updated Bank Statement Request (Last 6 Months)</option>
                    <option value="Beneficiary & Ownership Verification">Beneficiary & Ownership Verification</option>
                    <option value="Business Physical Address Inspection">Business Physical Address Inspection</option>
                    <option value="Other Underwriting Inquiry">Other Underwriting Inquiry</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="request-notes" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Instructions / Notes for Applicant & Audit Log
                  </label>
                  <textarea
                    id="request-notes"
                    rows="3"
                    placeholder="e.g. Please provide updated bank statement in PDF format with official bank seal..."
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-card)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', width: '100%' }}
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowRequestModal(false)}
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="new-app-btn"
                    disabled={isRequestingInfo}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                  >
                    {isRequestingInfo ? 'Recording...' : 'Log & Send Request →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Full Vertical Timeline List */}
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📭 No activity logs match the selected filter.</p>
              <button
                type="button"
                className="timeline-filter-btn"
                onClick={() => setTimelineFilter('all')}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="full-timeline-list">
              {filteredLogs.map((log, idx) => (
                <div key={log.id || idx} className="full-timeline-item">
                  <div className={`full-timeline-dot ${log.dotClass}`}>
                    {log.icon}
                  </div>

                  <div className="timeline-item-header">
                    <div className="timeline-item-actor">
                      <span className="timeline-actor-title">{log.actorLabel}</span>
                      <span className={`timeline-actor-badge ${log.badgeClass}`}>
                        {log.isHuman ? 'Reviewer' : 'System Agent'}
                      </span>
                    </div>

                    <div className="timeline-item-time">
                      <span>🕒 {formatDate(log.created_at || log.createdAt)}</span>
                      <span style={{ opacity: 0.6 }}>({formatRelativeTime(log.created_at || log.createdAt)})</span>
                    </div>
                  </div>

                  <p className="timeline-item-desc">
                    {log.summary || 'Step executed successfully.'}
                  </p>

                  <div className="timeline-item-meta-row">
                    {log.execution_time_ms !== undefined && log.execution_time_ms !== null && log.isAgent && (
                      <span>⚡ Execution: <strong>{log.execution_time_ms}ms</strong></span>
                    )}
                    {log.confidence_score !== undefined && log.confidence_score !== null && log.confidence_score > 0 && log.isAgent && (
                      <span>🎯 Model Confidence: <strong>{Math.round(log.confidence_score * 100)}%</strong></span>
                    )}
                    <span className="font-mono" style={{ opacity: 0.6 }}>ID: {(log.id || '').slice(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: DOCUMENTS & DATA
          ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="dashboard-card">
          <h2 className="card-title" style={{ marginBottom: '1rem' }}>
            📑 Commercial Banking & Applicant Metadata
          </h2>

          <div className="review-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="review-item">
              <span className="review-item-label">Bank Account Beneficiary</span>
              <span className="review-item-val">{merchantData.bank_details?.account_holder || 'Not Provided'}</span>
            </div>
            <div className="review-item">
              <span className="review-item-label">Account Number</span>
              <span className="review-item-val font-mono">{merchantData.bank_details?.account_number || '••••••••'}</span>
            </div>
            <div className="review-item">
              <span className="review-item-label">IFSC Code</span>
              <span className="review-item-val font-mono">{merchantData.bank_details?.ifsc || 'HDFC0001234'}</span>
            </div>
            <div className="review-item">
              <span className="review-item-label">Data Extraction Engine</span>
              <span className="review-item-val">{merchantData.data_source || 'Synthetic / Sample Engine'}</span>
            </div>
          </div>

          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
            Raw Evaluation Features
          </h3>
          <pre style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', overflow: 'auto', fontSize: '0.78rem', color: 'var(--text-dim)', maxHeight: '300px' }}>
            {typeof application.features === 'string'
              ? application.features
              : JSON.stringify(application.features || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
