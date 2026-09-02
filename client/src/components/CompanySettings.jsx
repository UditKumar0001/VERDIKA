import React, { useState, useEffect } from 'react';
import { getMyCompany, updateCompanySettings } from '../api/companyApi';
import { calculateEmi } from '../pages/NewApplication';

export default function CompanySettings({ user, company: initialCompany }) {
  const [company, setCompany] = useState(initialCompany);
  const [interestRate, setInterestRate] = useState(
    initialCompany?.default_interest_rate != null ? String(initialCompany.default_interest_rate) : '14'
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load fresh company profile & settings on mount
  useEffect(() => {
    async function loadCompany() {
      try {
        setLoading(true);
        const data = await getMyCompany();
        if (data?.company) {
          setCompany(data.company);
          setInterestRate(
            data.company.default_interest_rate != null
              ? String(data.company.default_interest_rate)
              : '14'
          );
        }
      } catch (err) {
        console.error('Failed to load company settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCompany();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numRate = parseFloat(interestRate);
    if (isNaN(numRate) || numRate <= 0 || numRate > 60) {
      setErrorMsg('Please enter a valid interest rate between 1% and 60% per annum.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateCompanySettings({
        default_interest_rate: numRate
      });

      setCompany(res.company);
      setSuccessMsg(`Default interest rate updated to ${numRate}% p.a. Public applications via /apply/${res.company.slug} will now calculate EMI using this rate.`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update company settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const link = company?.apply_link || `${window.location.origin}/apply/${company?.slug || 'verdika-capital'}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const parsedRate = parseFloat(interestRate) || 14;
  const sample12m = calculateEmi(500000, 12, parsedRate);
  const sample24m = calculateEmi(500000, 24, parsedRate);
  const sample36m = calculateEmi(500000, 36, parsedRate);
  const sample60m = calculateEmi(500000, 60, parsedRate);

  return (
    <div className="company-settings-container">
      {/* Top Header */}
      <div className="settings-page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '1.75rem' }}>⚙️</span>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Company Lending Settings & Facility Configuration
          </h1>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure default commercial interest rate benchmarks and public gateway parameters for{' '}
          <strong style={{ color: 'var(--accent-cyan)' }}>{company?.name || 'Your Finance Company'}</strong>.
        </p>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Main Settings Form Card */}
        <div className="dashboard-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.3rem' }}>📈</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Commercial Lending Interest Rate
            </h2>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="default_interest_rate" style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Default Annual Interest Rate (% p.a.) *
              </label>
              <div style={{ position: 'relative', maxWidth: '280px' }}>
                <input
                  id="default_interest_rate"
                  name="default_interest_rate"
                  type="number"
                  step="0.1"
                  min="1"
                  max="60"
                  required
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="queue-search-input"
                  style={{
                    paddingRight: '3rem',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--accent-cyan)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                  }}
                >
                  % p.a.
                </span>
              </div>
              <span className="field-hint" style={{ display: 'block', marginTop: '0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                This rate automatically populates the live EMI calculator on your public application form (<code>/apply/{company?.slug}</code>).
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={saving || loading}
                className="btn-primary"
                id="save-interest-rate-btn"
                style={{ padding: '0.65rem 1.5rem', fontWeight: 700 }}
              >
                {saving ? 'Saving Changes...' : '💾 Save Rate Configuration'}
              </button>

              <button
                type="button"
                onClick={() => setInterestRate('14')}
                className="btn-secondary"
                style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                title="Reset to default 14%"
              >
                Reset to 14%
              </button>
            </div>
          </form>

          {/* Quick Rate Info Box */}
          <div style={{ marginTop: '1.75rem', padding: '1rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              ℹ️ How this rate is used:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <li>Merchant applicants see: <strong>Interest: {parsedRate}% p.a.</strong> on the application form.</li>
              <li>Estimated monthly installments calculate using reducing balance formula at {parsedRate}% p.a.</li>
              <li>Actual rates offered to merchants remain subject to final underwriter credit approval.</li>
            </ul>
          </div>
        </div>

        {/* Live Simulator Card */}
        <div className="dashboard-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🧮</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Live EMI Rate Simulator
              </h2>
            </div>
            <span className="badge badge-approved" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
              @ {parsedRate}% p.a.
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            Preview of monthly installment figures for a baseline loan facility of <strong>₹5,00,000</strong> at your configured rate:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>12 Months (1 Year)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Interest: ₹{sample12m.totalInterest.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>₹{sample12m.emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-dim)' }}> /mo</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Repayable: ₹{sample12m.totalPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>24 Months (2 Years)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Interest: ₹{sample24m.totalInterest.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>₹{sample24m.emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-dim)' }}> /mo</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Repayable: ₹{sample24m.totalPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>36 Months (3 Years)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Interest: ₹{sample36m.totalInterest.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>₹{sample36m.emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-dim)' }}> /mo</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Repayable: ₹{sample36m.totalPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>60 Months (5 Years)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Interest: ₹{sample60m.totalInterest.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>₹{sample60m.emi.toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-dim)' }}> /mo</span></div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Repayable: ₹{sample60m.totalPayable.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Gateway Gateway Card */}
      {company && (
        <div className="dashboard-card" style={{ marginTop: '1.5rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🌐</span>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Merchant Application Gateway
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Dedicated multi-tenant intake link for {company.name}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <a
                href={`/apply/${company.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                ↗ Open Gateway
              </a>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <code style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
              {company.apply_link || `${window.location.origin}/apply/${company.slug}`}
            </code>
            <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
              Active Gateway (Configured @ {parsedRate}% p.a.)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
