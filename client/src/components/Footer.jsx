import React from 'react';
import { Link } from 'react-router-dom';
import razorpayLogo from '../assets/razorpay logo.webp';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link to="/" className="brand-logo">
            <img src="/logo.png" alt="Verdika Logo" className="brand-logo-img" />
            <span className="brand-name">Verdika</span>
            <span className="brand-tag">Risk Engine</span>
          </Link>
          <p className="footer-tagline">
            Explainable AI Underwriting with Adversarial Stress Testing &amp; Human Oversight.
          </p>
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <span className="footer-col-title">Navigation</span>
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/dashboard" className="footer-link">Dashboard Queue</Link>
            <Link to="/apply" className="footer-link">Submit Application</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Access</span>
            <Link to="/login" className="footer-link">Sign In</Link>
            <Link to="/signup" className="footer-link">Get Started</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          © {new Date().getFullYear()} Verdika AI Risk Engine. All rights reserved.
        </p>
        <div className="footer-buildathon-tag">
          <img src={razorpayLogo} alt="Razorpay Logo" className="buildathon-tag-icon" />
          <span>Built for the Razorpay AI Buildathon</span>
        </div>
      </div>
    </footer>
  );
}
