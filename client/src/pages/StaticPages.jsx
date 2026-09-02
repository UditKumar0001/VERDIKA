import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, Lock, FileText, Cpu, Users, Building, Mail, Sparkles } from 'lucide-react';

function StaticPageLayout({ title, subtitle, badge, icon: Icon = FileText, children }) {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container static-page-container">
      {/* Back navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.88rem', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>

      {/* Header Banner */}
      <div className="static-header-banner">
        {badge && (
          <span className="badge badge-approved" style={{ marginBottom: '0.85rem', display: 'inline-block', fontSize: '0.75rem', fontWeight: 800 }}>
            {badge}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
            <Icon size={26} />
          </div>
          <div>
            <h1 className="static-header-title">{title}</h1>
            {subtitle && <p className="static-header-sub">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="static-content-card">
        {children}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. ABOUT US
// -------------------------------------------------------------
export function AboutPage() {
  return (
    <StaticPageLayout
      title="About Verdika Risk Engine"
      subtitle="Autonomous multi-agent intelligence built to deliver transparent, fraud-resilient commercial underwriting."
      badge="Company Profile"
      icon={Building}
    >
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '0.75rem' }}>Our Mission</h2>
      <p style={{ fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Commercial lending in the digital era is too often slowed down by manual paperwork or obscured by opaque black-box machine learning models. 
        <strong> Verdika</strong> was engineered to bridge this divide by introducing a specialized 5-agent AI pipeline that evaluates merchant applications with speed, rigorous adversarial fraud detection, and 100% deterministic explainability.
      </p>

      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '2rem', marginBottom: '1rem' }}>Why Modern Lenders Choose Verdika</h2>
      <div className="info-cards-grid">
        <div className="info-card">
          <h4 className="info-card-title">
            <CheckCircle2 size={18} color="#10b981" /> 100% Deterministic Trace
          </h4>
          <p className="info-card-desc">
            Every underwriting score is accompanied by granular factor weights and transparent adverse action notices.
          </p>
        </div>

        <div className="info-card">
          <h4 className="info-card-title">
            <CheckCircle2 size={18} color="#06b6d4" /> Adversarial Stress Testing
          </h4>
          <p className="info-card-desc">
            Dedicated agents actively audit transaction ledgers for synthetic revenue spikes and settlement anomalies.
          </p>
        </div>

        <div className="info-card">
          <h4 className="info-card-title">
            <CheckCircle2 size={18} color="#8b5cf6" /> Human Underwriter Oversight
          </h4>
          <p className="info-card-desc">
            Borderline and high-risk cases automatically escalate to human credit officers with full contextual summaries.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1.5px solid rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem', display: 'block' }}>Ready to experience Verdika in action?</strong>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Test multi-agent risk scoring or configure custom company lending parameters.</div>
        </div>
        <Link to="/signup" className="info-card-btn" style={{ fontSize: '0.95rem', padding: '0.7rem 1.5rem' }}>
          Create Account →
        </Link>
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 2. PRICING & PLANS
// -------------------------------------------------------------
export function PricingPage() {
  return (
    <StaticPageLayout
      title="Pricing & Lending Platform Plans"
      subtitle="Scalable multi-tenant plans designed for growing FinTechs and institutional commercial lenders."
      badge="Transparent Plans"
      icon={Sparkles}
    >
      <div className="pricing-grid">
        {/* Tier 1: Community Tier */}
        <div className="pricing-card">
          <span className="pricing-tier-tag community">Community Tier</span>
          <div className="pricing-price-box">
            <div className="pricing-price-main community">Free Forever</div>
          </div>
          <p className="pricing-desc">
            Ideal for testing the 5-agent underwriting pipeline and exploring explainable risk analytics.
          </p>
          <ul className="pricing-features-list">
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#10b981" className="pricing-feature-icon" />
              <span>Up to <strong>50 applications</strong> / month</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#10b981" className="pricing-feature-icon" />
              <span>Full 5-Agent Risk &amp; Adversarial Pipeline</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#10b981" className="pricing-feature-icon" />
              <span>Razorpay IFSC Bank Validation</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#10b981" className="pricing-feature-icon" />
              <span>Deterministic PDF Audit Reports</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#10b981" className="pricing-feature-icon" />
              <span>Standard Community Support</span>
            </li>
          </ul>
          <Link to="/signup" className="pricing-action-btn pricing-btn-secondary">
            Get Started Free →
          </Link>
        </div>

        {/* Tier 2: FinTech Growth (Most Popular / Highlighted) */}
        <div className="pricing-card pricing-featured">
          <span className="pricing-badge-popular">⚡ Most Popular</span>
          <span className="pricing-tier-tag growth">FinTech Growth</span>
          <div className="pricing-price-box">
            <div className="pricing-price-main growth">
              ₹14,999 <span className="pricing-price-unit">/ month</span>
            </div>
          </div>
          <p className="pricing-desc">
            Engineered for active digital lending NBFCs, credit partners, and commercial loan aggregators.
          </p>
          <ul className="pricing-features-list">
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Up to <strong>2,000 applications</strong> / month</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Razorpay Penny-Drop FAV Validation</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Configurable Company Interest Rates</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Branded Public Tenant Application Link</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Team Access Control &amp; Underwriter Invites</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#6366f1" className="pricing-feature-icon" />
              <span>Priority 24/7 Technical Support</span>
            </li>
          </ul>
          <Link to="/signup" className="pricing-action-btn pricing-btn-primary">
            Start 14-Day Free Trial →
          </Link>
        </div>

        {/* Tier 3: Enterprise NBFC */}
        <div className="pricing-card pricing-enterprise">
          <span className="pricing-tier-tag enterprise">Enterprise NBFC</span>
          <div className="pricing-price-box">
            <div className="pricing-price-main enterprise">Custom Tier</div>
          </div>
          <p className="pricing-desc">
            Tailored for commercial banks and institutional facilities with customized risk policies.
          </p>
          <ul className="pricing-features-list">
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span><strong>Unlimited</strong> application volume</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span>Dedicated Isolated Cloud Infrastructure</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span>Custom Category Risk Benchmarks</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span>On-Premise &amp; Hybrid Deployment</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span>99.99% Uptime SLA Guarantee</span>
            </li>
            <li className="pricing-feature-item">
              <CheckCircle2 size={17} color="#f59e0b" className="pricing-feature-icon" />
              <span>Dedicated Account Executive &amp; Architect</span>
            </li>
          </ul>
          <a
            href="mailto:support@verdika.com?subject=Enterprise%20Pricing%20Inquiry%20-%20Verdika%20Risk%20Engine"
            className="pricing-action-btn pricing-btn-enterprise"
          >
            Contact Sales Team →
          </a>
        </div>
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 3. BLOG & RISK INTELLIGENCE
// -------------------------------------------------------------
export function BlogPage() {
  const articles = [
    {
      title: 'Deterministic Explainability: Why Black-Box Credit Scoring Fails Regulatory Audits',
      category: 'Credit Architecture',
      tagColor: 'tag-emerald',
      date: 'Aug 28, 2026',
      readTime: '5 min read',
      excerpt: 'How multi-agent decomposition creates mathematical audit trails that meet RBI and global fair-lending requirements.'
    },
    {
      title: 'Combatting Synthetic Revenue: How AdversarialAgents Detect Manipulation in Real Time',
      category: 'Fraud Resilience',
      tagColor: 'tag-purple',
      date: 'Aug 14, 2026',
      readTime: '6 min read',
      excerpt: 'Deep-dive into velocity smoothing, cyclic transaction inflation, and the algorithmic defenses against applicant gaming.'
    },
    {
      title: 'Zero-Trust Bank Account Verification: Implementing Razorpay Penny-Drop Validation',
      category: 'Engineering & Integrations',
      tagColor: 'tag-amber',
      date: 'Jul 30, 2026',
      readTime: '4 min read',
      excerpt: 'Automating commercial settlement verification before underwriting to eliminate identity mismatch and disbursal failures.'
    }
  ];

  return (
    <StaticPageLayout
      title="Verdika Risk Intelligence Blog"
      subtitle="Engineering insights, algorithmic credit architecture, and adversarial fraud detection research."
      badge="Engineering & Insights"
      icon={Cpu}
    >
      <div className="info-cards-list">
        {articles.map((art, idx) => (
          <article key={idx} className="info-card" style={{ cursor: 'pointer' }}>
            <div className="info-card-meta">
              <span className={`info-card-tag ${art.tagColor}`}>{art.category}</span>
              <span>{art.date}</span>
              <span>•</span>
              <span>{art.readTime}</span>
            </div>
            <h3 className="info-card-title">{art.title}</h3>
            <p className="info-card-desc">{art.excerpt}</p>
          </article>
        ))}
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 4. CAREERS
// -------------------------------------------------------------
export function CareersPage() {
  const jobs = [
    {
      title: 'Founding AI/ML Systems Engineer',
      type: 'Full-Time',
      location: 'Remote (India/APAC)',
      department: 'AI Core Engineering',
      desc: 'Architect multi-agent reasoning graphs, probabilistic scoring calibration, and high-throughput evaluation pipelines.'
    },
    {
      title: 'Senior Full-Stack Engineer (Node.js & React)',
      type: 'Full-Time',
      location: 'Remote',
      department: 'Platform & Product',
      desc: 'Build secure multi-tenant portals, interactive explainability charts, and robust API gateways.'
    },
    {
      title: 'Credit Risk Operations Specialist',
      type: 'Full-Time',
      location: 'Hybrid (Bengaluru)',
      department: 'Risk Operations',
      desc: 'Partner with NBFC clients to establish customized credit risk policies and analyze adversarial fraud trends.'
    }
  ];

  return (
    <StaticPageLayout
      title="Join the Verdika Team"
      subtitle="We are building the autonomous, explainable risk intelligence infrastructure for the next decade of digital finance."
      badge="We're Hiring"
      icon={Users}
    >
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '1.25rem' }}>Open Positions</h2>
      <div className="info-cards-list">
        {jobs.map((job, idx) => (
          <div key={idx} className="info-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                <h3 className="info-card-title" style={{ margin: 0 }}>{job.title}</h3>
                <span className="info-card-tag tag-emerald">{job.type}</span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
                {job.department} • {job.location}
              </div>
              <p className="info-card-desc">{job.desc}</p>
            </div>
            <a
              href={`mailto:careers@verdika.com?subject=Application%20for%20${encodeURIComponent(job.title)}`}
              className="info-card-btn"
            >
              Apply Now →
            </a>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 5. SECURITY & COMPLIANCE
// -------------------------------------------------------------
export function SecurityPage() {
  return (
    <StaticPageLayout
      title="Security, Encryption & Anti-Collusion"
      subtitle="Institutional-grade data protection, cryptographic audit logs, and strict anti-collusion guarantees."
      badge="Enterprise Security"
      icon={Shield}
    >
      <div className="info-cards-list">
        <div className="info-card">
          <h3 className="info-card-title">1. Tenant Data Isolation</h3>
          <p className="info-card-desc">
            Verdika implements strict multi-tenant data boundaries. Applications, transaction histories, and underwriter queues are cryptographically scoped to individual finance companies. No cross-tenant data leakage is permitted at any layer.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">2. Anti-Collusion Engine</h3>
          <p className="info-card-desc">
            Our anti-collusion engine automatically blocks underwriters and administrators from reviewing or approving loan applications submitted under their own personal email addresses, identities, or linked beneficiary accounts.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">3. Cryptographic Audit Trails</h3>
          <p className="info-card-desc">
            Every automated decision, prompt execution, confidence score, and human override is recorded in an immutable, append-only audit ledger with timestamp and actor attribution for full compliance transparency.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 6. PRIVACY POLICY
// -------------------------------------------------------------
export function PrivacyPage() {
  return (
    <StaticPageLayout
      title="Privacy Policy"
      subtitle="Last updated: September 2026. How Verdika collects, protects, and processes commercial underwriting data."
      badge="Legal & Privacy"
      icon={Lock}
    >
      <div className="info-cards-list">
        <div className="info-card">
          <h3 className="info-card-title">1. Data We Collect</h3>
          <p className="info-card-desc">
            We collect commercial applicant data including business legal names, GSTIN numbers, bank settlement identifiers (IFSC, account numbers), and historical weekly transaction ledgers exclusively to perform algorithmic credit evaluations.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">2. Document Security</h3>
          <p className="info-card-desc">
            Uploaded verification documents (GST certificates, PAN cards, bank statements) are encrypted in transit and stored in protected storage buckets accessible only by authorized underwriting personnel.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">3. No Data Selling</h3>
          <p className="info-card-desc">
            Verdika never sells, monetizes, or shares applicant commercial data with unauthorized third parties or advertising networks. Data is processed solely on behalf of the designated finance company partner.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 7. TERMS OF SERVICE
// -------------------------------------------------------------
export function TermsPage() {
  return (
    <StaticPageLayout
      title="Terms of Service"
      subtitle="Terms and conditions governing the Verdika AI Risk Engine platform and application gateways."
      badge="Terms of Use"
      icon={FileText}
    >
      <div className="info-cards-list">
        <div className="info-card">
          <h3 className="info-card-title">1. Platform Nature</h3>
          <p className="info-card-desc">
            Verdika provides an automated risk assessment and credit decision-support platform. Verdika does not directly issue loans or extend credit facilities. Final loan offers, interest rates, and loan terms are determined independently by the registered finance companies.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">2. Account Security & Two-Factor Authentication</h3>
          <p className="info-card-desc">
            Administrators and underwriters are responsible for maintaining the confidentiality of their credentials and one-time verification tokens. Any suspicious activity must be immediately reported to support.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}

// -------------------------------------------------------------
// 8. REGULATORY DISCLOSURES
// -------------------------------------------------------------
export function CompliancePage() {
  return (
    <StaticPageLayout
      title="Regulatory Disclosures & Credit Transparency"
      subtitle="Fair lending compliance, adverse action transparency, and algorithmic governance."
      badge="Compliance & RBI Standards"
      icon={CheckCircle2}
    >
      <div className="info-cards-list">
        <div className="info-card">
          <h3 className="info-card-title">1. Adverse Action Transparency</h3>
          <p className="info-card-desc">
            In alignment with fair lending best practices, every declined applicant receives a structured adverse action notice detailing the primary financial factors, cash flow metrics, or document anomalies that influenced the decision.
          </p>
        </div>

        <div className="info-card">
          <h3 className="info-card-title">2. Non-Discriminatory Algorithmic Design</h3>
          <p className="info-card-desc">
            The Verdika AI pipeline evaluates applicants strictly on mathematical revenue metrics, debt service coverage, and verifiable transactional data, free from demographic or biased indicators.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
}
