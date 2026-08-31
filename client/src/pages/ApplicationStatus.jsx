import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApplicationStatusApi } from '../api/applicationApi';

export default function ApplicationStatus() {
  const { applicationToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      if (!applicationToken) {
        setError('No application reference token provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await fetchApplicationStatusApi(applicationToken);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message || 'Unable to locate application status.');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [applicationToken]);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getDecisionMeta = (decision = '') => {
    const d = decision.toLowerCase();
    if (d.includes('approve')) {
      return {
        label: 'Approved',
        badgeClass: 'badge-approved',
        icon: '✓',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        title: 'Application Approved',
        headline: 'Congratulations! Your commercial loan application has been approved.'
      };
    }
    if (d.includes('reject')) {
      return {
        label: 'Declined',
        badgeClass: 'badge-rejected',
        icon: '✕',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.12)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        title: 'Application Declined',
        headline: 'Your application did not meet the required credit or compliance parameters at this time.'
      };
    }
    return {
      label: 'Under Review',
      badgeClass: 'badge-review',
      icon: '⏳',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      title: 'Under Review',
      headline: 'Your application is actively undergoing multi-agent underwriting verification.'
    };
  };

  if (loading) {
    return (
      <div className="status-page-container">
        <div className="status-loading-card">
          <div className="inline-spinner" style={{ width: '36px', height: '36px' }}></div>
          <h2>Locating Application Record...</h2>
          <p className="text-muted">Fetching real-time underwriting status for reference: {applicationToken}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="status-page-container">
        <div className="status-error-card">
          <span style={{ fontSize: '3rem' }}>🔍</span>
          <h2>Application Not Found</h2>
          <p className="text-muted" style={{ maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
            We could not find an underwriting record matching token: <code className="font-mono">{applicationToken}</code>. Please confirm your tracking link.
          </p>
          <Link to="/" className="btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const meta = getDecisionMeta(data.decision);
  const isApproved = data.decision.toLowerCase().includes('approve');
  const isRejected = data.decision.toLowerCase().includes('reject');

  return (
    <div className="status-page-container">
      {/* Brand Navbar */}
      <header className="status-page-header">
        <div className="status-brand">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="brand-logo-icon">⚡</span>
            <div>
              <span className="brand-name font-bold">VERDIKA</span>
              <span className="brand-sub" style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {data.companyName || 'Verdika Capital'} Financing
              </span>
            </div>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-card)', fontSize: '0.75rem' }}>
            Ref: <strong className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{data.applicationId}</strong>
          </span>
        </div>
      </header>

      {/* Main Status Panel */}
      <main className="status-content">
        {/* Banner Hero */}
        <div
          className="status-hero-card"
          style={{
            background: meta.bgColor,
            borderColor: meta.borderColor,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                <span className={`badge ${meta.badgeClass}`} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                  {meta.label.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Updated {formatDate(data.updatedAt || data.createdAt)}
                </span>
              </div>

              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>
                {data.businessName}
              </h1>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, maxWidth: '640px', lineHeight: '1.5' }}>
                {meta.headline}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lending Partner
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {data.companyName}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Tracker Timeline */}
        <div className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
            📊 Application Lifecycle Timeline
          </h3>

          <div className="status-timeline">
            {/* Step 1: Application Received */}
            <div className="timeline-step step-complete">
              <div className="step-marker">✓</div>
              <div className="step-content">
                <div className="step-title">Application Submitted</div>
                <div className="step-desc">Received business profile & commercial documents</div>
                <div className="step-time">{formatDate(data.createdAt)}</div>
              </div>
            </div>

            {/* Step 2: Multi-Agent Pipeline Verification */}
            <div className={`timeline-step ${data.status === 'closed' ? 'step-complete' : 'step-active'}`}>
              <div className="step-marker">{data.status === 'closed' ? '✓' : '⚡'}</div>
              <div className="step-content">
                <div className="step-title">Multi-Agent Risk & KYC Audit</div>
                <div className="step-desc">
                  DataAgent, DocumentVerificationAgent, RiskAgent & AdversarialAgent evaluation completed
                </div>
                <div className="step-time">
                  {data.dataSource === 'Real Bank Statement' ? '✓ Real Bank Statement Extracted' : 'Synthetic Data Baseline'}
                </div>
              </div>
            </div>

            {/* Step 3: Final Decision */}
            <div className={`timeline-step ${isApproved ? 'step-approved' : isRejected ? 'step-rejected' : 'step-pending'}`}>
              <div className="step-marker">{isApproved ? '✓' : isRejected ? '✕' : '3'}</div>
              <div className="step-content">
                <div className="step-title">
                  {isApproved ? 'Credit Sanction Approved' : isRejected ? 'Application Declined' : 'Underwriter Review'}
                </div>
                <div className="step-desc">
                  {isApproved
                    ? 'Credit line approved. Sanction letter generated.'
                    : isRejected
                    ? 'Does not meet current credit risk parameters.'
                    : 'Awaiting human credit officer signoff.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps / Explanation Card */}
        {isApproved && (
          <div
            className="dashboard-card"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              marginBottom: '1.5rem'
            }}
          >
            <h3 style={{ color: '#10b981', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚀</span> Next Steps for Disbursement
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
              Our operations team is finalizing your sanction term sheet. A dedicated relationship manager from{' '}
              <strong>{data.companyName}</strong> will contact you via your registered email to complete digital agreement execution.
              Disbursement will proceed to your verified commercial bank account:
            </p>
            {data.bankDetails && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Account Number</span>
                  <span className="font-mono text-cyan" style={{ fontWeight: '700' }}>{data.bankDetails.maskedAccountNumber}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Bank & IFSC</span>
                  <span>{data.bankDetails.bankName || 'HDFC Bank'} ({data.bankDetails.ifsc})</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Penny-Drop Status</span>
                  <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>{data.bankDetails.verificationStatus}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {isRejected && (
          <div
            className="dashboard-card"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              marginBottom: '1.5rem'
            }}
          >
            <h3 style={{ color: '#ef4444', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>ℹ️</span> Assessment Feedback
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
              {data.applicantMessage ||
                'Our automated multi-agent risk assessment evaluated your application against category risk and volatility parameters. At this moment, we are unable to extend credit financing.'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', margin: 0 }}>
              You may submit a fresh application after 90 days with updated operating revenue records and bank statements.
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <span>🖨️</span> Print / Save Status
          </button>

          <Link to="/" className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            ← Back to Verdika Home
          </Link>
        </div>
      </main>
    </div>
  );
}
