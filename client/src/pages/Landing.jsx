import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';


const techStackItems = [
  'React',
  'Node.js',
  'Express',
  'SQLite',
  'JWT',
  'bcrypt',
  'Python',
  'Multi-Agent AI Pipeline',
  'REST API'
];

const faqItems = [
  {
    question: 'What is Verdika?',
    answer:
      'Verdika is an AI-powered underwriting platform that evaluates merchant credit applications using a 5-agent pipeline, providing explainable risk decisions with full human oversight for ambiguous or flagged cases.'
  },
  {
    question: 'How does Verdika make a decision?',
    answer:
      "A merchant's transaction data is analyzed by specialized AI agents that compute risk signals, check for confidence/calibration, and detect signs of data manipulation. Based on this, an application is either auto-approved, auto-rejected, or routed to a human underwriter for review."
  },
  {
    question:
      'Why would my application be sent to a human reviewer instead of getting an instant decision?',
    answer:
      "Applications are routed to a human reviewer whenever the AI's confidence is not high enough for an automatic decision, or when the system detects a pattern that requires manual verification. This ensures no consequential decision is made without appropriate certainty or oversight."
  },
  {
    question: "If I'm rejected, will I know why?",
    answer:
      'Yes. Every rejection includes specific, real reasons — such as revenue volatility, refund rate compared to your industry, or business age — rather than a vague "denied" message.'
  },
  {
    question: 'What is "adversarial detection"?',
    answer:
      "It's a system that checks whether submitted data shows signs of being artificially manipulated (for example, unnatural transaction spikes right before applying). This protects the integrity of the underwriting process for all applicants."
  },
  {
    question: 'Is my business data secure?',
    answer:
      'Yes. All data is encrypted in transit, access to sensitive information is restricted by role (only authorized reviewers can see full risk details), and passwords are never stored in plain text.'
  },
  {
    question: 'Who can see my application details?',
    answer:
      'You can see your own application\'s status and outcome. Only authorized human underwriters can see the full technical risk breakdown — this data is never shared with other applicants or unauthorized users.'
  },
  {
    question: 'What happens after a human underwriter reviews my case?',
    answer:
      "The underwriter's decision is recorded alongside the AI's original recommendation in a permanent audit trail, and you'll see the final outcome on your dashboard."
  },
  {
    question: 'Can I reapply if my application is declined?',
    answer:
      'Yes. Declined applicants receive constructive guidance on which factors affected their decision, so they can address them before reapplying.'
  },
  {
    question:
      'Is Verdika a lending product, or does it decide loan approvals for a bank?',
    answer:
      'Verdika is a risk-assessment and underwriting decision-support system — it evaluates and explains credit risk. Final lending policies and product terms are determined by the institution deploying it.'
  }
];

export default function Landing() {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);


  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="dashboard-container landing-container">
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="merchant-welcome-tag hero-badge">
          ⚡ AUTOMATED MULTI-AGENT RISK ENGINE
        </div>

        <h1 className="landing-title">
          Explainable AI Underwriting <br />
          <span className="hero-gradient-text">for Modern Lenders</span>
        </h1>

        <p className="landing-subtitle">
          Verdika deploys a specialized 5-agent AI pipeline to evaluate merchant credit applications 
          with calibrated probabilistic risk scoring, adversarial fraud stress testing, and seamless human underwriter oversight.
        </p>

        <div className="hero-cta-group">
          <Link to="/signup" className="new-app-btn hero-primary-btn">
            Get Started <span className="btn-icon">→</span>
          </Link>
          <Link to="/login" className="btn-secondary hero-secondary-btn">
            Sign In to Portal
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="stats-row landing-stats">
        <div className="stat-card">
          <div className="stat-label">Explainability</div>
          <div className="stat-value text-emerald">100%</div>
          <p className="stat-sub">Deterministic Audit Trail</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">Execution Speed</div>
          <div className="stat-value text-cyan">&lt; 5ms</div>
          <p className="stat-sub">Sub-second Triage</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">Adversarial F1 Score</div>
          <div className="stat-value text-indigo">0.93</div>
          <p className="stat-sub">Fraud Anomaly Detection</p>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI Architecture</div>
          <div className="stat-value text-amber">5 Agents</div>
          <p className="stat-sub">Specialized Task Execution</p>
        </div>
      </div>

      {/* Tech Stack Marquee Strip */}
      <div className="marquee-strip-wrapper">
        <div className="marquee-strip-track">
          {[...techStackItems, ...techStackItems, ...techStackItems].map((tech, i) => (
            <React.Fragment key={i}>
              <span className="marquee-item">{tech}</span>
              <span className="marquee-bullet">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="stack-wrapper">
        <div className="stack-section" id="how-works-section">
          <div className="landing-section">
            <div className="section-header-center">
              <span className="preset-badge">Simple Process</span>
              <h2 className="section-title">How Verdika Works</h2>
              <p className="section-subtitle">
                A plain-language three-step workflow powering explainable credit decisions.
              </p>
            </div>

            <div className="how-it-works-grid">
              <div className="how-step-card">
                <div className="how-step-badge">01</div>
                <h3 className="how-step-title">Submit Application</h3>
                <p className="how-step-desc">
                  Merchant provides business details and weekly transaction data for instant evaluation.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-badge">02</div>
                <h3 className="how-step-title">AI Risk Analysis</h3>
                <p className="how-step-desc">
                  The system analyzes sales patterns, checks for data manipulation, and calculates a calibrated risk score with full reasoning.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-badge">03</div>
                <h3 className="how-step-title">Instant Decision or Human Review</h3>
                <p className="how-step-desc">
                  Clear-cut cases receive an immediate, explained decision; ambiguous or flagged cases route seamlessly to a human underwriter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Differentiators Section */}
        <div className="stack-section" id="key-diff-section">
          <div className="landing-section">
            <div className="section-header-center">
              <span className="preset-badge">Core Advantages</span>
              <h2 className="section-title">Key Differentiators</h2>
              <p className="section-subtitle">
                Built from the ground up for transparency, fraud resilience, and regulatory compliance.
              </p>
            </div>

            <div className="differentiators-grid">
              <div className="diff-card">
                <div className="diff-icon">💡</div>
                <h3 className="diff-title">Full Explainability</h3>
                <p className="diff-desc">
                  Every decision comes with clear, specific reasons, not a black-box score.
                </p>
              </div>

              <div className="diff-card">
                <div className="diff-icon">🛡️</div>
                <h3 className="diff-title">Adversarial Detection</h3>
                <p className="diff-desc">
                  The system actively checks for gamed or manipulated data before approving.
                </p>
              </div>

              <div className="diff-card">
                <div className="diff-icon">👥</div>
                <h3 className="diff-title">Human-in-the-Loop</h3>
                <p className="diff-desc">
                  Ambiguous or flagged cases are never auto-decided; a human always reviews them.
                </p>
              </div>

              <div className="diff-card">
                <div className="diff-icon">📜</div>
                <h3 className="diff-title">Complete Audit Trail</h3>
                <p className="diff-desc">
                  Every application has a full, permanent record of every agent's reasoning and any human decisions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Agents Section */}
        <div className="stack-section" id="agents-section">
          <div className="landing-section">
            <div className="section-header-center">
              <span className="preset-badge">Autonomous Pipeline</span>
              <h2 className="section-title">Specialized 5-Agent Architecture</h2>
              <p className="section-subtitle">
                Each agent executes an isolated evaluation step, passing structured findings down the pipeline.
              </p>
            </div>

            <div className="agent-cards-grid">
              {/* Agent 1 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <span className="agent-icon-badge">📊</span>
                  <div>
                    <h3 className="agent-name">DataAgent</h3>
                    <span className="agent-type">Data Normalization</span>
                  </div>
                </div>
                <p className="agent-desc">
                  Ingests raw transaction histories, computes sales velocity trends, revenue volatility, and benchmarks merchant metrics against category norms.
                </p>
              </div>

              {/* Agent 2 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <span className="agent-icon-badge">🛡️</span>
                  <div>
                    <h3 className="agent-name">RiskAgent</h3>
                    <span className="agent-type">Probabilistic Scoring</span>
                  </div>
                </div>
                <p className="agent-desc">
                  Calculates calibrated risk scores (0.0 – 1.0) with weighted reason code contributions and near-threshold uncertainty penalties.
                </p>
              </div>

              {/* Agent 3 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <span className="agent-icon-badge">🚨</span>
                  <div>
                    <h3 className="agent-name">AdversarialAgent</h3>
                    <span className="agent-type">Fraud Stress Testing</span>
                  </div>
                </div>
                <p className="agent-desc">
                  Audits applications for synthetic gaming patterns including refund smoothing, settlement gaming, and pre-application revenue spikes.
                </p>
              </div>

              {/* Agent 4 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <span className="agent-icon-badge">🔀</span>
                  <div>
                    <h3 className="agent-name">DecisionRouter</h3>
                    <span className="agent-type">Automated Triaging</span>
                  </div>
                </div>
                <p className="agent-desc">
                  Routes applications into Auto-Approve, Auto-Decline, or Human Underwriter Queue based on confidence thresholds and adversarial flags.
                </p>
              </div>

              {/* Agent 5 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <span className="agent-icon-badge">📝</span>
                  <div>
                    <h3 className="agent-name">ExplainerAgent</h3>
                    <span className="agent-type">Regulatory Notices</span>
                  </div>
                </div>
                <p className="agent-desc">
                  Drafts regulatory adverse action notices for merchants and structured executive summaries for underwriter audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Pipeline Sequence Banner */}
        <div className="stack-section" id="flow-section">
          <div className="landing-section">
            <div className="dashboard-card pipeline-sequence-card">
              <h3 className="card-title" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                End-to-End Decision Flow
              </h3>
              <div className="flow-steps-container">
                <div className="flow-step">
                  <span className="flow-step-num">1</span>
                  <span className="flow-step-title">Merchant Submission</span>
                  <span className="flow-step-sub">Payload Ingestion</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-step-num">2</span>
                  <span className="flow-step-title">Risk Engine</span>
                  <span className="flow-step-sub">Probabilistic Scoring</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-step-num">3</span>
                  <span className="flow-step-title">Stress Test</span>
                  <span className="flow-step-sub">Adversarial Audit</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-step-num">4</span>
                  <span className="flow-step-title">Decision Routing</span>
                  <span className="flow-step-sub">Human Queue Triage</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <span className="flow-step-num">5</span>
                  <span className="flow-step-title">Audit Trail</span>
                  <span className="flow-step-sub">Deterministic Trace</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="landing-section faq-section">
        <div className="faq-grid">
          <div className="faq-left">
            <span className="preset-badge">Got Questions?</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-subtitle">
              Everything you need to know about Verdika's explainable AI risk scoring and human oversight workflow.
            </p>
          </div>
          <div className="faq-right">
            <div className="faq-accordion-container">
                {faqItems.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}
                    >
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">{item.question}</span>
                        <span className={`faq-chevron ${isOpen ? 'faq-chevron-rotated' : ''}`}>▼</span>
                      </button>
                      {isOpen && (
                        <div className="faq-answer-box">
                          <p className="faq-answer-text">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="landing-bottom-cta">
        <h2>Accelerate Your Underwriting Decisioning</h2>
        <p>Experience autonomous AI risk evaluation with full regulatory explainability and human oversight.</p>
        <div className="hero-cta-group">
          <Link to="/signup" className="new-app-btn hero-primary-btn">
            Create Account →
          </Link>
          <Link to="/login" className="btn-secondary hero-secondary-btn">
            Sign In
          </Link>
        </div>
      </div>
</div>
    
  );
}
