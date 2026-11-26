import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import testimonialBanner from '../assets/testimonial-banner.png';
import platformVideo from '../assets/platform-video.mp4';

const faqItems = [
  {
    question: 'How does Verdika ensure decisions are explainable?',
    answer:
      'Reviewers see the exact DSCR calculation, monthly cash-flow averages, GSTN/Razorpay verification status, and the specific reason codes (e.g., "+34% revenue spike in last 14 days") that raised or lowered the risk score.'
  },
  {
    question: 'What is Adversarial Stress Testing?',
    answer:
      'Before any application is approved, Verdika checks 6-month bank statements for pre-application revenue spikes, round-number deposits, and refund smoothing meant to inflate cash flow.'
  },
  {
    question: 'Can underwriters override AI recommendations?',
    answer:
      'Yes. Reviewers can approve, decline, or request more documents on any application; their decision and written notes are appended to the same PDF and JSON audit report.'
  },
  {
    question: 'Can I reapply if my application is declined?',
    answer:
      'Yes. Declined applicants receive the exact reason codes that triggered the decline (such as insufficient DSCR or unverified bank account) so they know what to fix before reapplying.'
  },
  {
    question: 'Is Verdika a lending product, or does it decide loan approvals for a bank?',
    answer:
      'Verdika is underwriting software for NBFCs and commercial lendersâ€”it parses statements, flags fraud, and scores risk, while your team sets the credit policy and final approval.'
  }
];

export default function Landing() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [hoveredWhyIdx, setHoveredWhyIdx] = useState(null);
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const [verdiPrompt, setVerdiPrompt] = useState('');
  const [verdiReply, setVerdiReply] = useState('');
  const [verdiLoading, setVerdiLoading] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');

  useEffect(() => {
    const prompts = [
      'How does bank verification work for SME loans?',
      'Calculate DSCR from a 6-month bank statement...',
      'Flag any 14-day pre-application revenue spikes...',
      'Explain why application #VRD-8492 was routed to review...'
    ];
    let promptIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeoutId;

    const tick = () => {
      const current = prompts[promptIdx];
      if (!deleting) {
        charIdx += 1;
        setAnimatedPlaceholder(current.slice(0, charIdx));
        if (charIdx === current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 1400);
          return;
        }
        timeoutId = setTimeout(tick, 45);
      } else {
        charIdx -= 1;
        setAnimatedPlaceholder(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          promptIdx = (promptIdx + 1) % prompts.length;
          timeoutId = setTimeout(tick, 300);
          return;
        }
        timeoutId = setTimeout(tick, 22);
      }
    };

    timeoutId = setTimeout(tick, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAskVerdi = async (e) => {
    if (e) e.preventDefault();
    const msg = verdiPrompt.trim();
    if (!msg || verdiLoading) return;
    setVerdiLoading(true);
    setVerdiReply('');
    try {
      const res = await fetch(`${API_BASE_URL}/verdi-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationHistory: [] })
      });
      const data = await res.json();
      setVerdiReply(data.reply || data.error || 'No response received.');
    } catch {
      setVerdiReply('Unable to reach Verdi right now. Please try again.');
    } finally {
      setVerdiLoading(false);
    }
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div
      className="dashboard-container landing-container"
      style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '100vh', maxWidth: '100%', width: '100%', padding: 0, margin: 0 }}
    >
      {/* Split Hero Section (DecisionRules-inspired, full-bleed light purple with rounded bottom) */}
      <div
        className="landing-hero"
        style={{
          backgroundColor: '#d1d5db',
          borderRadius: '0 0 72px 72px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center',
          textAlign: 'left',
          padding: '7.5rem max(2rem, calc(50% - 620px)) 4rem',
          width: '100%',
          maxWidth: '100%',
          minHeight: '100vh',
          margin: '0 0 2rem 0'
        }}
      >
        <div>
          <h1 className="landing-title" style={{ textAlign: 'left', fontSize: 'clamp(2rem, 3.6vw, 3.1rem)', lineHeight: 1.12, marginBottom: '1.1rem' }}>
            Underwrite SME Loans <br />
            <span style={{ color: '#4f46e5' }}>for Build-First Teams</span>
          </h1>

          <p className="landing-subtitle" style={{ textAlign: 'left', margin: '0 0 1.75rem', maxWidth: '520px', fontSize: '1rem', fontWeight: 600 }}>
            Built for NBFCs and commercial lenders. Upload a merchant&apos;s GSTIN and 6-month bank PDF to get automated DSCR scoring, Razorpay bank verification, fraud-spike flags, and a signed decision report.
          </p>

          <div className="hero-cta-group" style={{ justifyContent: 'flex-start' }}>
            <Link
              to="/signup"
              className="new-app-btn hero-primary-btn"
              style={{ background: '#4f46e5', borderRadius: '999px', padding: '0.85rem 1.75rem' }}
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="btn-secondary hero-secondary-btn"
              style={{ borderRadius: '999px', padding: '0.85rem 1.75rem' }}
            >
              Sign In to Portal
            </Link>
          </div>
        </div>

        {/* Right: Visual Underwriting Flow Canvas */}
        <div
          style={{
            position: 'relative',
            borderRadius: '20px',
            padding: '1.25rem',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem'
          }}
        >
          <svg
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            <rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="20"
              ry="20"
              fill="none"
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="marching-dashed-border"
            />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border-card)', background: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>
              Merchant Submission
            </div>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>&rarr;</span>
            <div style={{ padding: '0.55rem 0.9rem', borderRadius: '10px', border: '1px solid #4f46e5', background: '#ffffff', fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>
              Risk &amp; Fraud Rules
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-card)', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Decision</div>
              <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', background: '#4f46e5', color: '#fff', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                Human Review
              </div>
              <div style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Auto-Approve
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-card)', background: '#ffffff' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Checks (#VRD-8492)</div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: '0.25rem' }}>DSCR: <strong>1.42</strong></div>
              <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--status-review)' }}>Spike: <strong>+34% (14d)</strong></div>
            </div>
          </div>

          <div style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-card)', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Decision Intelligence</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Signed PDF + Audit Trail</div>
            </div>
            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: 'var(--status-approved-bg)', color: 'var(--status-approved)' }}>
              Bank Verified
            </span>
          </div>
        </div>
      </div>


      {/* Verdika Architecture Diagram (Merged How It Works + End-to-End Flow, right above Verdi AI) */}
      <div style={{ width: '100%', padding: '0 max(2rem, calc(50% - 620px)) 2.5rem' }}>
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '3rem',
            textAlign: 'left',
            color: '#0f172a'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0, color: '#0f172a' }}>
                Verdika Architecture
              </h2>
              <p style={{ fontSize: '0.98rem', color: '#64748b', margin: '0.3rem 0 0' }}>
                End-to-end underwriting flow from merchant submission to signed audit report.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.4rem 0.85rem', borderRadius: '999px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '18px', height: '8px', borderRadius: '999px', background: '#4f46e5', display: 'inline-block' }} />
                API Endpoint
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Agent / Service
              </span>
            </div>
          </div>

          {/* Layer 1: Consumers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { title: 'Merchant Portal', tags: ['GSTIN', '6-MO PDF', 'IFSC'] },
              { title: 'Underwriter Console', tags: ['2FA OTP', 'REVIEW QUEUE'] },
              { title: 'AI Assistant (Verdi)', tags: ['GEMINI', 'POLICY Q&A'] },
              { title: 'REST API & Webhooks', tags: ['JSON', 'SIGNED PDF'] }
            ].map((node) => (
              <div key={node.title} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '0.5rem' }}>{node.title}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {node.tags.map((t) => (
                    <span key={t} style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Layer 2: API Layer */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', margin: '0.5rem 0 1.25rem' }}>
            {['POST /api/applications', 'RAZORPAY PENNY-DROP', 'POST /api/verdi-chat'].map((ep) => (
              <span key={ep} style={{ background: '#4f46e5', color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600, padding: '0.45rem 1.1rem', borderRadius: '999px' }}>
                {ep}
              </span>
            ))}
          </div>

          {/* Layer 3: Services (Full-Bleed Image Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              {
                title: 'Data & Risk',
                badge: 'DSCR 1.42',
                badgeBg: '#ecfdf5',
                badgeColor: '#059669',
                border: '1px solid #e2e8f0',
                img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
              },
              {
                title: 'Verdika Core',
                badge: '5-AGENT',
                badgeBg: '#eef2ff',
                badgeColor: '#4f46e5',
                border: '2px solid #4f46e5',
                img: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=800&q=80'
              },
              {
                title: 'Fraud & Audit',
                badge: '+34% SPIKE',
                badgeBg: '#fffbeb',
                badgeColor: '#d97706',
                border: '1px solid #e2e8f0',
                img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
              }
            ].map((card) => (
              <div
                key={card.title}
                className="arch-visual-card"
                style={{
                  position: 'relative',
                  height: '220px',
                  borderRadius: '12px',
                  border: card.border,
                  overflow: 'hidden',
                  backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.85) 100%), url(${card.img})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '0.9rem 1rem'
                }}
              >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.08rem', fontWeight: 700, color: '#ffffff' }}>{card.title}</span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '0.25rem 0.6rem', borderRadius: '4px', background: card.badgeBg, color: card.badgeColor, fontWeight: 700 }}>
                    {card.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Layer 4: Data */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {[
              { name: 'SQLite / PostgreSQL', sub: 'Applications & Audit Logs' },
              { name: 'Brevo / Gmail SMTP', sub: '2FA OTP & Decision Alerts' }
            ].map((db) => (
              <div key={db.name} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.5rem', minWidth: '250px' }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 700 }}>{db.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{db.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Verdi AI Section (DecisionRules-inspired, full-bleed with shine) */}
      <div
        style={{
          width: '100%',
          marginBottom: '2.5rem',
          background: 'radial-gradient(circle at 22% 62%, rgba(139, 92, 246, 0.42), transparent 46%), radial-gradient(circle at 78% 68%, rgba(45, 212, 191, 0.34), transparent 46%), #161224',
          borderRadius: '0 0 32px 32px',
          padding: '7.5rem max(2rem, calc(50% - 620px))',
          minHeight: '520px',
          textAlign: 'center',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 20px 50px rgba(79, 70, 229, 0.22)'
        }}
      >
          <h2 style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.1rem)', fontWeight: 700, marginBottom: '0.9rem', color: '#ffffff' }}>
            Build with AI. <span style={{ color: '#2dd4bf' }}>Decide with certainty.</span>
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1.12rem', maxWidth: '700px', margin: '0 auto 2.25rem', lineHeight: 1.6 }}>
            See how Verdika evaluates credit risk. Pick an example below or ask Verdi your own underwriting question.
          </p>

          <form
            onSubmit={handleAskVerdi}
            style={{
              maxWidth: '880px',
              margin: '0 auto',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'left'
            }}
          >
            <textarea
              rows={2}
              value={verdiPrompt}
              onChange={(e) => setVerdiPrompt(e.target.value)}
              placeholder={animatedPlaceholder || 'Ask Verdi anything...'}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.08rem',
                resize: 'none',
                marginBottom: '1.25rem'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  { label: 'Loan Scorecard', prompt: 'How does Verdika calculate the credit risk score?' },
                  { label: 'Bank Verification', prompt: 'How does bank verification work for SME loans?' },
                  { label: 'Fraud Spike Check', prompt: 'What is adversarial stress testing for revenue spikes?' },
                  { label: 'DSCR Calculation', prompt: 'How is DSCR calculated from 6-month bank statements?' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setVerdiPrompt(preset.prompt)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '999px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#e2e8f0',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={verdiLoading}
                style={{
                  padding: '0.6rem 1.35rem',
                  borderRadius: '12px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em',
                  cursor: verdiLoading ? 'wait' : 'pointer',
                  opacity: verdiLoading ? 0.7 : 1
                }}
              >
                {verdiLoading ? 'ASKING...' : 'ASK VERDI'}
              </button>
            </div>
          </form>

          {verdiReply && (
            <div
              style={{
                maxWidth: '880px',
                margin: '1.25rem auto 0',
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(45, 212, 191, 0.35)',
                textAlign: 'left',
                color: '#e2e8f0',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {verdiReply}
            </div>
          )}
      </div>

      {/* Why Verdika Section (DecisionRules-inspired, right above testimonial) */}
      <div style={{ width: '100%', padding: '1rem max(2rem, calc(50% - 620px)) 2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ maxWidth: '640px', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              THE SOLUTION
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.35rem)', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              Why Verdika
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', lineHeight: 1.6, margin: 0 }}>
              Verdika empowers credit teams and engineers to collaborate on an explainable, AI-driven underwriting platform. Avoid monolithic bloat and deploy calibrated risk scoring with built-in fraud checks.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* ISO 27001 Seal */}
            <svg width="64" height="64" viewBox="0 0 64 64" aria-label="ISO 27001 Certified">
              <circle cx="32" cy="32" r="30" fill="#111827" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
              <text x="32" y="25" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="800" fontFamily="sans-serif">ISO</text>
              <text x="32" y="37" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="700" fontFamily="sans-serif">27001</text>
              <text x="32" y="48" textAnchor="middle" fill="#9ca3af" fontSize="6" fontWeight="700" fontFamily="sans-serif">CERTIFIED</text>
            </svg>

            {/* AICPA SOC 2 Seal */}
            <svg width="64" height="64" viewBox="0 0 64 64" aria-label="AICPA SOC 2">
              <circle cx="32" cy="32" r="30" fill="#0284c7" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
              <text x="32" y="28" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800" fontFamily="sans-serif">AICPA</text>
              <text x="32" y="40" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="800" fontFamily="sans-serif">SOC 2</text>
            </svg>

            {/* GDPR / RBI Seal */}
            <svg width="64" height="64" viewBox="0 0 64 64" aria-label="GDPR Compliant">
              <circle cx="32" cy="32" r="30" fill="#1d4ed8" />
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const cx = 32 + 23 * Math.cos(rad);
                const cy = 32 + 23 * Math.sin(rad);
                return <circle key={deg} cx={cx} cy={cy} r="1.4" fill="#fde047" />;
              })}
              <text x="32" y="36" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800" fontFamily="sans-serif">GDPR</text>
            </svg>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.5rem' }}>
          {[
            {
              title: 'Modular underwriting, zero shelfware',
              desc: 'Start with 6-month bank statement parsing and GSTIN checks, then add custom credit rules, underwriters, and lending products at your own pace.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              )
            },
            {
              title: 'No-code rules meet full API access',
              desc: 'Risk managers tune DSCR thresholds and routing rules visually while engineers integrate directly via REST API and signed webhooks.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              )
            },
            {
              title: 'AI decisioning. Measured, not hyped.',
              desc: 'Every verdict outputs deterministic factor weights, Razorpay bank verification, and adversarial spike flagsâ€”never an unexplainable black box.',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C12 7.52 16.48 12 22 12C16.48 12 12 16.48 12 22C12 16.48 7.52 12 2 12C7.52 12 12 7.52 12 2Z" />
                </svg>
              )
            },
            {
              title: 'Dedicated Underwriting Support',
              desc: 'Get hands-on onboarding for your credit policy, custom PDF report templates, and human-in-the-loop review workflows.',
              icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>)
            }
          ].map((card, idx) => {
            const isHovered = hoveredWhyIdx === idx;
            return (
              <div
                key={card.title}
                onMouseEnter={() => setHoveredWhyIdx(idx)}
                onMouseLeave={() => setHoveredWhyIdx(null)}
                style={{
                  position: 'relative',
                  background: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '2rem',
                  minHeight: '210px',
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'left',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isHovered ? 'translateY(-3px)' : 'none',
                  boxShadow: isHovered ? '0 14px 32px rgba(79, 70, 229, 0.3)' : 'none'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.1rem',
                    opacity: isHovered ? 0 : 1,
                    transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    pointerEvents: isHovered ? 'none' : 'auto'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {card.icon}
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, fontFamily: 'var(--font-heading)', lineHeight: 1.25 }}>
                    {card.title}
                  </div>
                </div>

                <p
                  style={{
                    position: 'absolute',
                    inset: '2rem',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '0.96rem',
                    lineHeight: 1.6,
                    color: 'rgba(255, 255, 255, 0.95)',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                    pointerEvents: isHovered ? 'auto' : 'none'
                  }}
                >
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Testimonial Banner (Crisp Native HTML/CSS) */}
      <div style={{ width: '100%', padding: '0 max(2rem, calc(50% - 620px))', marginBottom: '2.5rem' }}>
        <div
          style={{
            backgroundColor: '#e9eef5',
            borderRadius: '16px',
            padding: '2rem 2.5rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 1fr) 1.5fr',
            gap: '2rem',
            alignItems: 'center',
            color: '#0f172a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              role="img"
              aria-label="Jannik William F."
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundImage: `url(${testimonialBanner})`,
                backgroundSize: '1650% auto',
                backgroundPosition: '5.55% 49%',
                backgroundRepeat: 'no-repeat',
                filter: 'contrast(1.08) brightness(1.03)',
                flexShrink: 0
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                Jannik William F.
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                Enterprise Architect, COOP Bank, G2 Verified Review
              </div>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.08rem', lineHeight: 1.7, color: '#0f172a', margin: 0 }}>
            Verdika nails the balance between user-friendly UI and powerful logic. We have underwriters who can understand the logic and make adjustments as needed, while developers can extend it.
          </p>
        </div>
      </div>

      {/* Build-First Platform Section (right beneath testimonial) */}
      <div style={{ width: '100%', padding: '1rem max(2rem, calc(50% - 620px)) 3rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
              THE BUILD-FIRST PATH
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.35rem)', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              Underwriting you own and extend
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Built for NBFCs and lending teams that want full control over their credit rules, fraud checks, and audit trail.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>What you get</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                {[
                  'Start with bank & GST verification, add custom rules as you grow',
                  'Your risk team tunes thresholds, your engineers extend the API',
                  'Underwriters and developers collaborate in one auditable workspace'
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2dd4bf', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>What it means long-term</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                {[
                  'Every rule change versioned, every credit decision auditable',
                  'Never locked into a black-box scoring vendor',
                  'Architecture stays flexible as RBI & lending policies evolve'
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4f46e5', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <video
              src={platformVideo}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', display: 'block' }}
            />
            <Link
              to="/signup"
              className="new-app-btn"
              style={{ background: '#4f46e5', borderRadius: '999px', padding: '0.8rem 1.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      <div className="stack-wrapper">
        {/* Key Differentiators Section (DecisionRules-inspired) */}
        <div id="features" style={{ width: '100%', padding: '2rem max(2rem, calc(50% - 620px)) 3rem', textAlign: 'left' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              KEY DIFFERENTIATORS
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.35rem)', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Built for transparency, fraud resilience, and compliance
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', margin: 0 }}>
              Every decision outputs deterministic reason codes, bank verification, and a signed audit trail.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <img
                    src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=400&q=80"
                    alt="Kaveri Textiles Shop"
                    style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>APP #VRD-8492</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Kaveri Textiles &bull; ₹12,00,000</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '1rem', color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.45rem' }}>
                    <span style={{ color: '#64748b' }}>Risk Score</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>0.38 (Moderate)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.45rem' }}>
                    <span style={{ color: '#64748b' }}>Bank &amp; GST</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>Verified</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Verdict</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>HUMAN REVIEW</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f1f5f9', padding: '0.75rem 1rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#475569' }}>
                  <span>RULE</span>
                  <span>MEASURED</span>
                  <span>ACTION</span>
                </div>
                {[
                  { rule: 'DSCR', val: '1.42', act: 'Pass', color: '#059669' },
                  { rule: '14d Spike', val: '+34%', act: 'Flag', color: '#d97706' },
                  { rule: 'Routing', val: 'Flagged', act: 'Human Queue', color: '#4f46e5' }
                ].map((r) => (
                  <div key={r.rule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{r.rule}</span>
                    <span style={{ color: '#475569' }}>{r.val}</span>
                    <span style={{ color: r.color, fontWeight: 700 }}>{r.act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '1rem' }}>Capability</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#475569', fontWeight: 700, fontSize: '1rem' }}>Legacy Rules / Black-Box ML</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#4f46e5', fontWeight: 700, fontSize: '1rem' }}>Verdika</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '1.02rem', color: '#0f172a' }}>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.95rem 1.25rem', fontWeight: 600 }}>Decision Reasoning</td>
                  <td style={{ padding: '0.95rem 1.25rem', color: '#64748b' }}>Opaque score without factor breakdown</td>
                  <td style={{ padding: '0.95rem 1.25rem' }}>Deterministic reason codes &amp; weighted factor attribution</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.95rem 1.25rem', fontWeight: 600 }}>Fraud &amp; Gaming Checks</td>
                  <td style={{ padding: '0.95rem 1.25rem', color: '#64748b' }}>Static threshold rules</td>
                  <td style={{ padding: '0.95rem 1.25rem' }}>Adversarial stress-testing for revenue spikes &amp; refund smoothing</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.95rem 1.25rem', fontWeight: 600 }}>Edge-Case Handling</td>
                  <td style={{ padding: '0.95rem 1.25rem', color: '#64748b' }}>Auto-rejects or stalls in manual queues</td>
                  <td style={{ padding: '0.95rem 1.25rem' }}>Confidence-based routing to human underwriters with full context</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.95rem 1.25rem', fontWeight: 600 }}>Audit &amp; Compliance</td>
                  <td style={{ padding: '0.95rem 1.25rem', color: '#64748b' }}>Scattered logs across spreadsheets</td>
                  <td style={{ padding: '0.95rem 1.25rem' }}>Immutable per-application trail of agent &amp; reviewer actions</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Specialized 5-Agent Architecture (DecisionRules AI Agent style) */}
        <div id="agents-section" style={{ width: '100%', padding: '1rem 0 2.5rem' }}>
          <div
            style={{
              background: '#141022',
              borderRadius: '28px',
              padding: '4rem max(2rem, calc(50% - 620px))',
              color: '#ffffff',
              textAlign: 'left'
            }}
          >
            {(() => {
              const agents = [
                {
                  name: 'DataAgent',
                  role: 'Data Hygiene & Schema',
                  desc: 'Validates inbound merchant payloads, parses 6-month bank PDFs, computes rolling cash-flow velocity, and runs Razorpay Fund Account verification.',
                  bullets: ['6-month PDF statement parsing', 'GSTIN & IFSC schema checks', 'Razorpay penny-drop verification', 'Normalized cash-flow metrics'],
                  image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
                  output: '{ "dscr": 1.42, "bankVerified": true, "avgMonthlyInflow": 1840000 }'
                },
                {
                  name: 'RiskAgent',
                  role: 'Probabilistic Scoring',
                  desc: 'Calculates calibrated default probability, evaluates debt service coverage ratio (DSCR), and scores cash-flow stability across monthly cycles.',
                  bullets: ['Calibrated default probability', 'Debt service coverage (DSCR)', 'Bounce & overdraft weighting', 'Sector-adjusted risk band'],
                  image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=900&q=80',
                  output: '{ "riskScore": 0.38, "band": "MODERATE", "confidence": 0.91 }'
                },
                {
                  name: 'AdversarialAgent',
                  role: 'Fraud & Manipulation',
                  desc: 'Audits transaction sequences for synthetic gaming patterns including refund smoothing, circular transfers, and pre-application revenue spikes.',
                  bullets: ['14-day revenue spike detection', 'Round-number deposit flagging', 'Refund smoothing checks', 'Counterparty concentration audit'],
                  image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=900&q=80',
                  output: '{ "flagged": true, "reason": "+34% revenue spike in last 14 days" }'
                },
                {
                  name: 'DecisionRouter',
                  role: 'Automated Triaging',
                  desc: 'Routes applications into Auto-Approve, Auto-Decline, or Human Underwriter Queue based on confidence thresholds and adversarial flags.',
                  bullets: ['Policy-driven auto-approval', 'Instant decline with reason codes', 'Escalation for flagged anomalies', 'SLA-tracked underwriter queue'],
                  image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=900&q=80',
                  output: '{ "route": "HUMAN_REVIEW", "priority": "HIGH" }'
                },
                {
                  name: 'ExplainerAgent',
                  role: 'Regulatory Notices',
                  desc: 'Drafts plain-language adverse action notices for merchants and structured executive summaries for underwriter audit trails and PDF reports.',
                  bullets: ['Deterministic reason codes', 'Signed PDF audit report', 'Merchant-friendly decline notes', 'Immutable reviewer log'],
                  image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
                  output: '{ "report": "VRD-8492.pdf", "signed": true }'
                }
              ];
              const active = agents[activeAgentIdx] || agents[0];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                      SPECIALIZED 5-AGENT ARCHITECTURE
                    </div>
                    <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.5rem)', fontWeight: 700, lineHeight: 1.15, marginBottom: '1rem', color: '#ffffff' }}>
                      <span style={{ color: '#818cf8' }}>Thinking agent pipeline</span> that reads, reasons, and returns structured credit decisions
                    </h2>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      {agents.map((ag, idx) => (
                        <button
                          key={ag.name}
                          type="button"
                          onClick={() => setActiveAgentIdx(idx)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '999px',
                            border: activeAgentIdx === idx ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.16)',
                            background: activeAgentIdx === idx ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                            color: activeAgentIdx === idx ? '#ffffff' : '#cbd5e1',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {ag.name}
                        </button>
                      ))}
                    </div>

                    <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                      {active.desc}
                    </p>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                      {active.bullets.map((b) => (
                        <li key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/methodology"
                      style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.4)', paddingBottom: '0.2rem', textDecoration: 'none' }}
                    >
                      Read Methodology
                    </Link>
                  </div>

                  <div
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(20, 16, 34, 0.35) 0%, rgba(20, 16, 34, 0.92) 100%), url(${active.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '20px',
                      padding: '2rem',
                      minHeight: '300px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                        {active.role}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                        {active.name}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(11, 17, 32, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.82rem',
                        color: '#a5f3fc',
                        lineHeight: 1.6,
                        wordBreak: 'break-word'
                      }}
                    >
                      {active.output}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      {/* Integrations / Tech Stack Circular Logo Marquee */}
      <div style={{ width: '100%', padding: '1rem 0 2rem', textAlign: 'center', overflow: 'hidden' }}>
        <p style={{ fontSize: '2.25rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
          Verdika integrates seamlessly with your lending stack and data sources.
        </p>
        <div className="marquee-strip-wrapper" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          <div className="marquee-strip-track" style={{ gap: '3.5rem', alignItems: 'center', animationDuration: '14s' }}>
            {[
              {
                name: 'Node.js',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" fill="#539E43" />
                    <path d="M12 6.5L16.5 9.1V14.3L12 16.9L7.5 14.3V9.1L12 6.5Z" fill="#ffffff" opacity="0.25" />
                  </svg>
                )
              },
              {
                name: 'React',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="2.2" fill="#0ea5e9" />
                    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" />
                    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(60 12 12)" />
                    <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(120 12 12)" />
                  </svg>
                )
              },
              {
                name: 'Google Gemini',
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C12 7.52 16.48 12 22 12C16.48 12 12 16.48 12 22C12 16.48 7.52 12 2 12C7.52 12 12 7.52 12 2Z" fill="#4f46e5" />
                  </svg>
                )
              },
              {
                name: 'SQLite',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <ellipse cx="12" cy="6" rx="7" ry="3" stroke="#2563eb" strokeWidth="1.8" />
                    <path d="M5 6V18C5 19.66 8.13 21 12 21C15.87 21 19 19.66 19 18V6" stroke="#2563eb" strokeWidth="1.8" />
                    <path d="M5 12C5 13.66 8.13 15 12 15C15.87 15 19 13.66 19 12" stroke="#2563eb" strokeWidth="1.8" />
                  </svg>
                )
              },
              {
                name: 'Razorpay',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M14.5 3L7 13.5H12L9.5 21L17 10.5H12L14.5 3Z" fill="#1d4ed8" />
                  </svg>
                )
              },
              {
                name: 'REST API',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M8 7L3 12L8 17M16 7L21 12L16 17M13.5 5L10.5 19" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )
              },
              {
                name: 'PDF / jsPDF',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#dc2626" strokeWidth="1.8" />
                    <path d="M14 2V8H20" stroke="#dc2626" strokeWidth="1.8" />
                  </svg>
                )
              },
              {
                name: 'Brevo',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#0d9488" strokeWidth="1.8" />
                    <path d="M4 7L12 13L20 7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                )
              }
            ]
              .concat([
                {
                  name: 'Node.js',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2Z" fill="#539E43" />
                      <path d="M12 6.5L16.5 9.1V14.3L12 16.9L7.5 14.3V9.1L12 6.5Z" fill="#ffffff" opacity="0.25" />
                    </svg>
                  )
                },
                {
                  name: 'React',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="2.2" fill="#0ea5e9" />
                      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" />
                      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(60 12 12)" />
                      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="#0ea5e9" strokeWidth="1.5" transform="rotate(120 12 12)" />
                    </svg>
                  )
                },
                {
                  name: 'Google Gemini',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C12 7.52 16.48 12 22 12C16.48 12 12 16.48 12 22C12 16.48 7.52 12 2 12C7.52 12 12 7.52 12 2Z" fill="#4f46e5" />
                    </svg>
                  )
                },
                {
                  name: 'SQLite',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="#2563eb" strokeWidth="1.8" />
                      <path d="M5 6V18C5 19.66 8.13 21 12 21C15.87 21 19 19.66 19 18V6" stroke="#2563eb" strokeWidth="1.8" />
                      <path d="M5 12C5 13.66 8.13 15 12 15C15.87 15 19 13.66 19 12" stroke="#2563eb" strokeWidth="1.8" />
                    </svg>
                  )
                },
                {
                  name: 'Razorpay',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M14.5 3L7 13.5H12L9.5 21L17 10.5H12L14.5 3Z" fill="#1d4ed8" />
                    </svg>
                  )
                },
                {
                  name: 'REST API',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M8 7L3 12L8 17M16 7L21 12L16 17M13.5 5L10.5 19" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )
                },
                {
                  name: 'PDF / jsPDF',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#dc2626" strokeWidth="1.8" />
                      <path d="M14 2V8H20" stroke="#dc2626" strokeWidth="1.8" />
                    </svg>
                  )
                },
                {
                  name: 'Brevo',
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#0d9488" strokeWidth="1.8" />
                      <path d="M4 7L12 13L20 7" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )
                }
              ])
              .map((tech, idx) => (
                <div
                  key={idx}
                  title={tech.name}
                  style={{
                    width: '68px',
                    height: '68px',
                    transform: 'scale(1.65)',
                    background: 'transparent',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {tech.icon}
                </div>
              ))}
          </div>
        </div>
      </div>

      </div>

      {/* FAQ Accordion Section (DecisionRules-inspired) */}
      <div id="faq" style={{ width: '100%', padding: '3rem max(2rem, calc(50% - 620px))', textAlign: 'left' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            NEED HELP?
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.35rem)', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', margin: 0 }}>
            We&apos;re here to help with any questions you have about underwriting, risk scoring, and supported features.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 240px) 1fr', gap: '2rem', alignItems: 'start' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', paddingTop: '0.75rem' }}>
            General
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      padding: '1.15rem 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      fontSize: '0.96rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <span>{item.question}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.25s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{ paddingBottom: '1.15rem', color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Public Methodology / Model Card & Changelog (DecisionRules-inspired) */}
      <div id="methodology" style={{ width: '100%', padding: '1rem max(2rem, calc(50% - 620px)) 2rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2.25rem', textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                MODEL CARD
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#0f172a', marginBottom: '0.65rem' }}>
                Public Methodology
              </h3>
              <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Verdika separates deterministic financial rules (DSCR, bounce rate, GSTIN/bank validation) from adversarial anomaly checks. Every verdict outputs signed factor weights and reason codes.
              </p>
              <Link
                to="/methodology"
                style={{ color: '#4f46e5', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none' }}
              >
                Read Scoring Methodology &rarr;
              </Link>
            </div>

            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                CHANGELOG
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: '#0f172a', marginBottom: '0.75rem' }}>
                Recent Releases
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', color: '#475569' }}>
                <li style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0 }}>v1.4</span>
                  <span>2FA email OTP verification &amp; Razorpay penny-drop bank validation.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0 }}>v1.3</span>
                  <span>Exportable PDF underwriting reports with full agent &amp; reviewer audit trail.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0 }}>v1.2</span>
                  <span>Adversarial stress-testing for 14-day pre-application revenue spikes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Banner (DecisionRules-inspired) */}
      <div style={{ width: '100%', padding: '1rem max(2rem, calc(50% - 620px)) 3.5rem' }}>
        <div
          style={{
            background: '#1b172b',
            borderRadius: '20px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            color: '#ffffff'
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', fontWeight: 700, color: '#ffffff', marginBottom: '0.65rem' }}>
            Start Underwriting With Full Auditability
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
            Create a lender workspace to test statement parsing, adversarial flags, and human-review routing.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
            <Link
              to="/signup"
              style={{
                background: '#ffffff',
                color: '#4f46e5',
                borderRadius: '999px',
                padding: '0.8rem 1.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none'
              }}
            >
              Create Account
            </Link>
            <Link
              to="/login"
              style={{
                background: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '999px',
                padding: '0.8rem 1.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
