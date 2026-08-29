import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitApplyApplication } from '../api/applicationApi';

// Pre-packaged realistic sample datasets for instant demo testing
const SAMPLE_PRESETS = {
  auto_approve: {
    label: 'Healthy Merchant (Auto-Approve Demo)',
    business_name: 'Sunrise Digital Solutions Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    registration_date: '2022-03-15',
    business_age_months: 48,
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 85 + (i % 5) * 3,
      gross_revenue: 425000 + i * 5000,
      avg_order_value: 5000 + (i % 3) * 50,
      refund_count: (i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0)),
      refund_amount: (i % 3 === 0 ? 10000 : (i % 2 === 0 ? 5000 : 0)),
      chargeback_count: 0,
      upi_pct: 0.55,
      card_pct: 0.35,
      netbanking_pct: 0.10,
      settlement_delay_days: 1.2
    }))
  },

  auto_reject: {
    label: 'High Risk Merchant (Auto-Reject Demo)',
    business_name: 'Metro Wholesale Apparel Traders',
    business_category: 'apparel',
    gstin: '27AABCM5678H1Z2',
    registration_date: '2026-06-01',
    business_age_months: 2,
    transaction_history: [
      {
        date: '2026-02-01',
        transaction_count: 500,
        gross_revenue: 1000000,
        avg_order_value: 2000,
        refund_count: 350,
        refund_amount: 700000,
        chargeback_count: 15,
        upi_pct: 0.9,
        card_pct: 0.05,
        netbanking_pct: 0.05,
        settlement_delay_days: 8.0
      },
      {
        date: '2026-02-15',
        transaction_count: 100,
        gross_revenue: 50000,
        avg_order_value: 500,
        refund_count: 80,
        refund_amount: 40000,
        chargeback_count: 10,
        upi_pct: 0.1,
        card_pct: 0.8,
        netbanking_pct: 0.1,
        settlement_delay_days: 15.0
      },
      {
        date: '2026-03-01',
        transaction_count: 20,
        gross_revenue: 5000,
        avg_order_value: 250,
        refund_count: 18,
        refund_amount: 4500,
        chargeback_count: 5,
        upi_pct: 0.5,
        card_pct: 0.2,
        netbanking_pct: 0.3,
        settlement_delay_days: 20.0
      }
    ]
  },

  route_to_human: {
    label: 'Borderline Case (Route to Human Demo)',
    business_name: 'Kalyan Supermart & Provision',
    business_category: 'grocery',
    gstin: '27AABCK9012K1Z8',
    registration_date: '2024-01-20',
    business_age_months: 28,
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 180 + (i % 7) * 8 - (i % 3) * 12,
      gross_revenue: 190000 + (i % 5) * 15000 - (i % 2) * 20000,
      avg_order_value: 1050 + (i % 4) * 30,
      refund_count: 4 + (i % 3),
      refund_amount: 4200,
      chargeback_count: 0,
      upi_pct: 0.65,
      card_pct: 0.25,
      netbanking_pct: 0.10,
      settlement_delay_days: 1.5
    }))
  }
};

export default function NewApplication() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    business_name: '',
    business_category: 'electronics',
    gstin: '',
    registration_date: '',
    business_age_months: ''
  });

  const [txHistory, setTxHistory] = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [error, setError] = useState(null);

  // Result state after submission
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoadSample = (presetKey) => {
    const preset = SAMPLE_PRESETS[presetKey];
    if (!preset) return;

    setFormData({
      business_name: preset.business_name,
      business_category: preset.business_category,
      gstin: preset.gstin,
      registration_date: preset.registration_date,
      business_age_months: preset.business_age_months
    });
    setTxHistory(preset.transaction_history);
    setActivePreset(presetKey);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.business_name) {
      setError('Please provide a business name.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setPipelineStep(1);

    // Simulate step progress for multi-agent visualization
    const t1 = setTimeout(() => setPipelineStep(2), 600);
    const t2 = setTimeout(() => setPipelineStep(3), 1200);
    const t3 = setTimeout(() => setPipelineStep(4), 1800);

    try {
      const historyToUse = txHistory || SAMPLE_PRESETS.auto_approve.transaction_history;

      const payload = {
        business_name: formData.business_name,
        business_category: formData.business_category,
        gstin: formData.gstin || '27ABCDE1234F1Z5',
        registration_date: formData.registration_date || '2024-01-01',
        business_age_months: Number(formData.business_age_months) || 24,
        transaction_history: historyToUse
      };

      const res = await submitApplyApplication(payload);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setSubmitting(false);
    }
  };

  // Render Result Screen when submission completes
  if (result) {
    const decision = (result.decision || '').toLowerCase();
    const isApproved = decision === 'auto_approve' || decision === 'approved';
    const isRejected = decision === 'auto_reject' || decision === 'rejected';
    const isPending = decision === 'route_to_human' || !isApproved && !isRejected;

    return (
      <div className="dashboard-container">
        <div className="result-card-wrapper">
          {/* Header Status Banner */}
          {isApproved && (
            <div className="result-banner banner-approved">
              <div className="banner-icon">🎉</div>
              <div>
                <h2 className="banner-title">Application Approved!</h2>
                <p className="banner-desc">Automated AI Underwriting Verification Complete</p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="result-banner banner-rejected">
              <div className="banner-icon">⚠️</div>
              <div>
                <h2 className="banner-title">Application Declined</h2>
                <p className="banner-desc">Automated Credit Risk Threshold Evaluation</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="result-banner banner-review">
              <div className="banner-icon">⏳</div>
              <div>
                <h2 className="banner-title">Application Under Review</h2>
                <p className="banner-desc">Routed to Human Underwriter Queue for Manual Inspection</p>
              </div>
            </div>
          )}

          {/* Details Body */}
          <div className="result-body">
            <div className="result-meta-grid">
              <div className="meta-box">
                <span className="meta-label">Application Reference ID</span>
                <span className="meta-value font-mono">{result.applicationId}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">Underwriting Decision</span>
                <span className={`meta-value ${isApproved ? 'text-emerald' : isRejected ? 'text-rose' : 'text-amber'}`}>
                  {isApproved ? 'AUTO APPROVED' : isRejected ? 'DECLINED' : 'ROUTE TO HUMAN REVIEW'}
                </span>
              </div>
            </div>

            {/* Applicant Message Box */}
            <div className="applicant-message-box">
              <h4 className="message-box-title">Underwriting Notice & Guidance</h4>
              <p className="message-box-content">{result.applicantMessage || 'Your application has been processed by our underwriting engine.'}</p>
            </div>

            {isRejected && (
              <div className="advice-callout">
                <h5 className="advice-title">💡 How to improve your application for re-submission</h5>
                <ul className="advice-list">
                  <li>Maintain stable weekly transaction volumes with lower revenue volatility.</li>
                  <li>Keep refund rates below category benchmark thresholds.</li>
                  <li>Build a longer operating history (12+ months of consistent settlements).</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="result-actions">
              <Link to="/dashboard" className="btn-secondary">
                ← Back to Dashboard
              </Link>
              <button
                className="btn-primary"
                onClick={() => {
                  setResult(null);
                  setActivePreset(null);
                  setFormData({
                    business_name: '',
                    business_category: 'electronics',
                    gstin: '',
                    registration_date: '',
                    business_age_months: ''
                  });
                  setTxHistory(null);
                }}
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1 className="dashboard-title">Submit Underwriting Application</h1>
          <p className="dashboard-subtitle">
            Provide business metrics for automated credit assessment via the multi-agent AI pipeline.
          </p>
        </div>
      </div>

      {/* Demo Preset Helper Toolbar */}
      <div className="preset-toolbar">
        <div className="preset-toolbar-header">
          <span className="preset-badge">⚡ Demo Preset Helper</span>
          <span className="preset-hint">Click a button to auto-fill form fields with sample transaction data:</span>
        </div>
        <div className="preset-buttons">
          <button
            type="button"
            className={`preset-btn preset-approved ${activePreset === 'auto_approve' ? 'active' : ''}`}
            onClick={() => handleLoadSample('auto_approve')}
          >
            <span>🟢</span> Auto-Approve Sample
          </button>
          <button
            type="button"
            className={`preset-btn preset-rejected ${activePreset === 'auto_reject' ? 'active' : ''}`}
            onClick={() => handleLoadSample('auto_reject')}
          >
            <span>🔴</span> Auto-Reject Sample
          </button>
          <button
            type="button"
            className={`preset-btn preset-review ${activePreset === 'route_to_human' ? 'active' : ''}`}
            onClick={() => handleLoadSample('route_to_human')}
          >
            <span>🟡</span> Route to Human Sample
          </button>
        </div>
      </div>

      {/* Main Application Form */}
      <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="apply-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="business_name">Business Legal Name *</label>
              <input
                id="business_name"
                name="business_name"
                type="text"
                required
                placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                value={formData.business_name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business_category">Business Category *</label>
              <select
                id="business_category"
                name="business_category"
                value={formData.business_category}
                onChange={handleInputChange}
                className="auth-select"
              >
                <option value="electronics">Electronics</option>
                <option value="apparel">Apparel</option>
                <option value="food">Food & Dining</option>
                <option value="services">Services & Logistics</option>
                <option value="grocery">Grocery & Supermart</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="gstin">GSTIN (Optional)</label>
              <input
                id="gstin"
                name="gstin"
                type="text"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={formData.gstin}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="registration_date">Registration Date</label>
              <input
                id="registration_date"
                name="registration_date"
                type="date"
                value={formData.registration_date}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="business_age_months">Business Operating Age (Months)</label>
              <input
                id="business_age_months"
                name="business_age_months"
                type="number"
                min="1"
                max="300"
                placeholder="e.g. 24"
                value={formData.business_age_months}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Transaction History Status */}
          <div className="tx-status-box">
            <div className="tx-status-header">
              <span className="tx-status-title">Transaction History Data</span>
              {txHistory ? (
                <span className="tx-status-loaded">
                  ✓ {txHistory.length} Weekly Datapoints Loaded
                </span>
              ) : (
                <span className="tx-status-default">
                  ℹ️ Standard baseline transaction dataset attached
                </span>
              )}
            </div>
            <p className="tx-status-desc">
              Weekly sales velocity, refund ratios, payment mix, and settlement timelines are passed into the DataAgent for feature enrichment.
            </p>
          </div>

          {/* Submit Controls & Loading State */}
          {submitting ? (
            <div className="pipeline-loading-box">
              <div className="spinner"></div>
              <h4 className="loading-title">Executing Multi-Agent Pipeline...</h4>
              <p className="loading-sub">Running DataAgent → RiskAgent → AdversarialAgent → DecisionRouter → ExplainerAgent</p>
              <div className="pipeline-progress-steps">
                <span className={`step-dot ${pipelineStep >= 1 ? 'active' : ''}`}>1. Data Ingestion</span>
                <span className={`step-dot ${pipelineStep >= 2 ? 'active' : ''}`}>2. Risk Calculation</span>
                <span className={`step-dot ${pipelineStep >= 3 ? 'active' : ''}`}>3. Stress Test</span>
                <span className={`step-dot ${pipelineStep >= 4 ? 'active' : ''}`}>4. Decision & Explanation</span>
              </div>
            </div>
          ) : (
            <div className="form-actions">
              <button type="submit" className="submit-btn-primary">
                Execute AI Underwriting Pipeline →
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
