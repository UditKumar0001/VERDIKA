import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApplicationById, submitReviewDecision } from '../api/applicationApi';
import { generateUnderwritingReportPDF } from '../utils/pdfGenerator';

export default function ApplicationDetail() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
      // Re-render page with updated backend response
      setApplication(res.application);
      setAuditLogs(res.auditLogs || []);
    } catch (err) {
      setActionError(err.message || `Failed to submit ${decisionType} decision.`);
    } finally {
      setSubmitting(false);
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

      {/* Main Detail Grid */}
      <div className="detail-grid">
        {/* Left Column: Risk Engine & Adversarial Assessment */}
        <div className="detail-main-col">
          {/* Risk Summary Card */}
          <div className="dashboard-card">
            <div className="card-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>🛡️ Risk Engine Evaluation Summary</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {merchantData.data_source === 'Real Bank Statement' ? (
                  <span className="badge badge-approved" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', fontSize: '0.75rem' }}>
                    ✓ Data Source: Real Bank Statement
                  </span>
                ) : (
                  <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    ℹ️ Data Source: Synthetic/Sample Data
                  </span>
                )}
                {confidence !== null && (
                  <span className="conf-pill">Confidence: {(confidence * 100).toFixed(0)}%</span>
                )}
              </div>
            </div>

            {/* Risk Gauge Bar */}
            {riskScore !== null ? (
              <div className="risk-gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">Calculated Risk Score</span>
                  <span className={`gauge-val ${riskScore > 0.6 ? 'text-rose' : riskScore > 0.3 ? 'text-amber' : 'text-emerald'}`}>
                    {(riskScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="gauge-track">
                  <div
                    className={`gauge-fill ${riskScore > 0.6 ? 'bg-rose' : riskScore > 0.3 ? 'bg-amber' : 'bg-emerald'}`}
                    style={{ width: `${Math.min(100, Math.max(4, riskScore * 100))}%` }}
                  ></div>
                </div>
                {merchantData.extraction_notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📄</span>
                    <span>{merchantData.extraction_notes}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">No numerical risk score computed.</p>
            )}

            {/* Reason Codes Breakdown */}
            <div className="reason-codes-section">
              <h4 className="section-sub-title">Risk Factor Breakdown (Reason Codes)</h4>
              {reasonCodes.length === 0 ? (
                <div className="clean-reason-box">
                  <span className="text-emerald">✓ Baseline Profile: No elevated risk triggers detected.</span>
                </div>
              ) : (
                <div className="reason-cards-list">
                  {reasonCodes.map((rc, idx) => (
                    <div key={idx} className="reason-card">
                      <div className="reason-card-header">
                        <span className="reason-code-tag">{rc.code || rc.factor || 'RISK_FACTOR'}</span>
                        {rc.weight !== undefined && (
                          <span className="reason-weight-tag">+{rc.weight} risk weight</span>
                        )}
                      </div>
                      <p className="reason-card-desc">{rc.description || rc.details || 'Elevated risk factor triggered.'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Adversarial Assessment Card */}
          <div className="dashboard-card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>
              🔍 Adversarial Stress Test & Integrity Audit
            </h2>

            {isAdversarial ? (
              <div className="adversarial-detail-warning-box">
                <div className="adv-warning-header">
                  <span className="adv-warning-icon">🚨</span>
                  <div>
                    <h3 className="adv-warning-title">Adversarial Manipulation Flagged</h3>
                    <p className="adv-warning-sub">
                      Automated stress testing detected synthetic data gaming or anomaly patterns.
                    </p>
                  </div>
                </div>

                <div className="adv-patterns-list">
                  {detectedPatterns.map((pat, idx) => (
                    <div key={idx} className="adv-pattern-item">
                      <div className="adv-pattern-name">Pattern #{idx + 1}: {pat.pattern || 'Anomaly'}</div>
                      <div className="adv-pattern-evidence">{pat.evidence || 'Pattern evidence detected.'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="adversarial-clean-box">
                <span className="clean-icon">🛡️</span>
                <div>
                  <h4 className="clean-title">No Adversarial Patterns Detected</h4>
                  <p className="clean-sub">
                    Stress testing confirmed data integrity across settlement timelines, refund ratios, and revenue trends.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bank & Settlement Details Card (if available) */}
          {merchantData.bank_details && (
            <div className="dashboard-card">
              <div className="card-toolbar" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  🏦 Commercial Bank & Settlement Profile
                </h2>
                {(() => {
                  const bVer = merchantData.bank_details.bank_verification || {};
                  const status = bVer.status || merchantData.bank_details.bankVerificationStatus || (merchantData.bank_details.ifsc_verified ? 'Verified' : 'Not Attempted');
                  if (status === 'Verified') {
                    return (
                      <span className="badge badge-approved" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)', fontSize: '0.75rem' }}>
                        ✓ Bank Account Active & Verified (Razorpay Penny-Drop)
                      </span>
                    );
                  }
                  if (status === 'Name Mismatch') {
                    return (
                      <span className="badge badge-review" style={{ fontSize: '0.75rem' }}>
                        ⚠️ Name Mismatch (Penny-Drop)
                      </span>
                    );
                  }
                  if (status === 'Failed') {
                    return (
                      <span className="badge badge-rejected" style={{ fontSize: '0.75rem' }}>
                        ✕ Verification Failed (Penny-Drop)
                      </span>
                    );
                  }
                  return (
                    <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(100, 116, 139, 0.2)', color: 'var(--text-muted)' }}>
                      ○ Not Verified
                    </span>
                  );
                })()}
              </div>

              <div className="review-grid">
                <div className="review-item">
                  <span className="review-item-label">Account Holder</span>
                  <span className="review-item-value font-semibold">{merchantData.bank_details.account_holder || merchantData.business_name || 'N/A'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Account Number</span>
                  <span className="review-item-value font-mono text-cyan">
                    {merchantData.bank_details.masked_account_number || (merchantData.bank_details.account_number ? 'XXXXXX' + String(merchantData.bank_details.account_number).slice(-4) : 'N/A')}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">IFSC Code</span>
                  <span className="review-item-value font-mono">{merchantData.bank_details.ifsc || 'N/A'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Bank & Branch</span>
                  <span className="review-item-value">
                    {merchantData.bank_details.bank_name ? `${merchantData.bank_details.bank_name}${merchantData.bank_details.branch ? ` (${merchantData.bank_details.branch})` : ''}` : 'Verified Commercial Bank'}
                  </span>
                </div>
                {merchantData.bank_details.bank_verification?.referenceId && (
                  <div className="review-item">
                    <span className="review-item-label">Razorpay Penny-Drop Ref</span>
                    <span className="review-item-value font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                      {merchantData.bank_details.bank_verification.referenceId}
                    </span>
                  </div>
                )}
                {merchantData.bank_details.bank_verification?.registeredName && (
                  <div className="review-item">
                    <span className="review-item-label">Bank Registered Beneficiary</span>
                    <span className="review-item-value font-semibold" style={{ fontSize: '0.85rem' }}>
                      {merchantData.bank_details.bank_verification.registeredName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verified KYC Documents & Quality Assessment Card */}
          <div className="dashboard-card">
            <div className="card-toolbar" style={{ marginBottom: '1rem' }}>
              <h2 className="card-title">📁 KYC Document Verification & Quality Audit</h2>
            </div>
            <div className="doc-checklist">
              {[
                { key: 'gst_certificate', title: 'GST Registration Certificate', doc: merchantData.documents?.gst_certificate, defaultExt: 'PDF/Image' },
                { key: 'pan_card', title: 'Company / Signatory PAN Card', doc: merchantData.documents?.pan_card, defaultExt: 'Image/PDF' },
                { key: 'bank_statement', title: 'Bank Statement (Last 6 Months)', doc: merchantData.documents?.bank_statement, defaultExt: 'PDF' }
              ].map(({ key, title, doc }) => {
                let status = 'Missing';
                let badgeClass = 'badge-doc-missing';
                let iconClass = 'check-optional';
                let iconSymbol = '✕';
                let note = 'Document not uploaded';

                if (doc && (doc.name || doc.verified || doc.isUploaded)) {
                  const sizeBytes = doc.size !== undefined ? Number(doc.size) : null;
                  const width = doc.width !== undefined ? Number(doc.width) : null;
                  const isCorrupted = doc.isCorrupted === true || doc.isReadable === false;
                  const isImage = (doc.type && doc.type.startsWith('image/')) || /\.(jpg|jpeg|png)$/i.test(doc.name || '');
                  const isPdf = (doc.type && doc.type === 'application/pdf') || /\.pdf$/i.test(doc.name || '');

                  if (isCorrupted) {
                    status = 'Needs Re-upload';
                    badgeClass = 'badge-doc-reupload';
                    iconClass = 'check-optional';
                    iconSymbol = '⚠️';
                    note = 'File appears corrupted or unreadable';
                  } else if (isImage && width !== null && width < 600) {
                    status = 'Needs Re-upload';
                    badgeClass = 'badge-doc-reupload';
                    iconClass = 'check-optional';
                    iconSymbol = '⚠️';
                    note = `Low Resolution (${width}px width) — scan may be illegible (min 600px)`;
                  } else if (isImage && sizeBytes !== null && sizeBytes > 0 && sizeBytes < 20 * 1024) {
                    status = 'Needs Re-upload';
                    badgeClass = 'badge-doc-reupload';
                    iconClass = 'check-optional';
                    iconSymbol = '⚠️';
                    note = `Possible quality issue — file size unusually small (${(sizeBytes / 1024).toFixed(1)}KB < 20KB)`;
                  } else if (isPdf && doc.pageCount !== undefined && Number(doc.pageCount) === 0) {
                    status = 'Needs Re-upload';
                    badgeClass = 'badge-doc-reupload';
                    iconClass = 'check-optional';
                    iconSymbol = '⚠️';
                    note = 'Unreadable or corrupted PDF (0 pages)';
                  } else if (isPdf && sizeBytes !== null && sizeBytes > 0 && sizeBytes < 10 * 1024) {
                    status = 'Needs Re-upload';
                    badgeClass = 'badge-doc-reupload';
                    iconClass = 'check-optional';
                    iconSymbol = '⚠️';
                    note = `PDF size unusually small (${(sizeBytes / 1024).toFixed(1)}KB < 10KB)`;
                  } else {
                    status = 'Clear';
                    badgeClass = 'badge-doc-clear';
                    iconClass = 'check-success';
                    iconSymbol = '✓';
                    note = doc.name ? `${doc.name}${doc.sizeFormatted ? ` (${doc.sizeFormatted})` : ''}` : 'Verified & Readable';
                  }
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
          {isPending ? (
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
          ) : (
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

        {/* Right Column: Audit Trail Timeline */}
        <div className="detail-side-col">
          <div className="dashboard-card">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              📜 Audit Trail Timeline
            </h2>

            <div className="timeline-container">
              {auditLogs.length === 0 ? (
                <p className="text-muted">No audit logs recorded for this application.</p>
              ) : (
                auditLogs.map((log, idx) => {
                  const isHuman = (log.actor && log.actor !== 'system') || (log.agent_name || log.agentName) === 'HumanReviewer';
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
                            {isHuman ? `Human Underwriter` : `Agent: ${agentName}`}
                          </span>
                          <span className="timeline-time">{formatDate(log.created_at)}</span>
                        </div>

                        <p className="timeline-summary">{log.summary || 'Step executed successfully.'}</p>

                        {log.execution_time_ms !== undefined && log.execution_time_ms !== null && !isHuman && (
                          <span className="timeline-meta-tag">{log.execution_time_ms}ms execution</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
