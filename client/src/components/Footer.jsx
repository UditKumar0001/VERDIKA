import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import razorpayLogo from '../assets/razorpay logo.webp';

// Crisp SVGs for social brands
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.69-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const handleAnchorScroll = (anchorId) => (e) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      const target = document.getElementById(anchorId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.location.href = `/#${anchorId}`;
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        
        {/* Top Highlighted Newsletter / Contact Strip */}
        <div className="footer-top-strip">
          <div className="footer-strip-left">
            <div className="footer-strip-icon-box">
              <HelpCircle size={20} />
            </div>
            <div className="footer-strip-text">
              <span className="footer-strip-title">Have questions about Verdika's Risk Engine?</span>
              <span className="footer-strip-sub">
                Reach our enterprise underwriting specialists directly at{' '}
                <a href="mailto:support@verdika.com" className="footer-strip-email-link">
                  support@verdika.com
                </a>
              </span>
            </div>
          </div>

          <div className="footer-strip-right">
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <div className="footer-newsletter-input-wrapper">
                <Mail className="footer-input-icon" size={16} />
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter work email for updates..."
                  className="footer-newsletter-input"
                  required
                />
              </div>
              <button type="submit" className="footer-newsletter-btn">
                {subscribed ? (
                  <>
                    <CheckCircle2 size={15} /> Subscribed
                  </>
                ) : (
                  <>
                    Subscribe <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 4-Column Main Footer Grid */}
        <div className="footer-grid-4col">
          
          {/* Column 1: Brand & Socials */}
          <div className="footer-brand-col">
            <Link to="/" className="brand-logo footer-brand-logo">
              <img src="/logo.png" alt="Verdika Logo" className="brand-logo-img" />
              <span className="brand-name">Verdika</span>
              <span className="brand-tag">Risk Engine</span>
            </Link>

            <p className="footer-brand-tagline">
              Autonomous multi-agent risk scoring, adversarial fraud detection, and deterministic credit explainability for modern lenders.
            </p>

            {/* Social Icons */}
            <div className="footer-social-links">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon-btn"
                aria-label="LinkedIn"
                title="LinkedIn"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon-btn"
                aria-label="Twitter / X"
                title="Twitter / X"
              >
                <TwitterIcon />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon-btn"
                aria-label="GitHub"
                title="GitHub"
              >
                <GithubIcon />
              </a>
              <a
                href="mailto:support@verdika.com"
                className="footer-social-icon-btn"
                aria-label="Contact Support"
                title="Email Support"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="footer-col">
            <span className="footer-col-title">Product</span>
            <a href="/#how-it-works" onClick={handleAnchorScroll('how-it-works')} className="footer-link">How It Works</a>
            <a href="/#features" onClick={handleAnchorScroll('features')} className="footer-link">Key Differentiators</a>
            <a href="/#agents-section" onClick={handleAnchorScroll('agents-section')} className="footer-link">5-Agent Pipeline</a>
            <Link to="/pricing" className="footer-link">Pricing &amp; Plans</Link>
            <a href="/#faq" onClick={handleAnchorScroll('faq')} className="footer-link">FAQ</a>
          </div>

          {/* Column 3: Company */}
          <div className="footer-col">
            <span className="footer-col-title">Company</span>
            <Link to="/about" className="footer-link">About Us</Link>
            <Link to="/blog" className="footer-link">Risk Intelligence Blog</Link>
            <Link to="/careers" className="footer-link">Careers <span className="footer-badge-hiring">Hiring</span></Link>
            <a href="mailto:support@verdika.com?subject=Enterprise%20Inquiry%20-%20Verdika%20Risk%20Engine" className="footer-link">Contact Sales</a>
            <Link to="/security" className="footer-link">Security &amp; Compliance</Link>
          </div>

          {/* Column 4: Get Started */}
          <div className="footer-col">
            <span className="footer-col-title">Get Started</span>
            <Link to="/login" className="footer-link">Sign In</Link>
            <Link to="/signup" className="footer-link">Create Account</Link>
            <Link to="/apply" className="footer-link">Find a Lender</Link>
            <Link to="/apply" className="footer-link">Submit Application</Link>
            <Link to="/login" className="footer-link">Underwriter Portal</Link>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-bottom-left">
            <p className="footer-copyright-text">
              © {new Date().getFullYear()} Verdika AI Risk Engine. All rights reserved.
            </p>
            <div className="footer-legal-links">
              <Link to="/privacy" className="footer-legal-link">Privacy Policy</Link>
              <span className="footer-legal-dot">•</span>
              <Link to="/terms" className="footer-legal-link">Terms of Service</Link>
              <span className="footer-legal-dot">•</span>
              <Link to="/compliance" className="footer-legal-link">Regulatory Disclosures</Link>
            </div>
          </div>

          <div className="footer-buildathon-tag">
            <img src={razorpayLogo} alt="Razorpay Logo" className="buildathon-tag-icon" />
            <span>Built for the Razorpay AI Buildathon</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
