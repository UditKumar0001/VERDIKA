import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lookupCompanyBySlug } from '../api/companyApi';
import NewApplication from './NewApplication';

/**
 * Public Merchant Application Page
 * Multi-tenant route: /apply/:companySlug
 * Accessible publicly with zero login requirement.
 */
export default function PublicApply() {
  const { companySlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCompany() {
      if (!companySlug) {
        setError('No finance company specified in application link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await lookupCompanyBySlug(companySlug);
        if (isMounted) {
          setCompany(data.company);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Invalid or expired application link.');
          setCompany(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCompany();

    return () => {
      isMounted = false;
    };
  }, [companySlug]);

  if (loading) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1.5rem auto' }}></div>
          <h3 style={{ color: 'var(--text-main)' }}>Connecting to Finance Partner...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading merchant application gateway for {companySlug}
          </p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '480px', padding: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: 'var(--status-rejected)', marginBottom: '0.75rem' }}>
            Invalid or Expired Link
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            The merchant application link <code style={{ color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>/apply/{companySlug}</code> does not match any active finance institution on our platform.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Return to Verdika Home
            </Link>
            <Link to="/login" style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textDecoration: 'none' }}>
              Are you a finance partner? Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Branded Banner for Public Merchant Application */}
      <div
        className="public-tenant-banner"
        style={{
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          borderBottom: '1px solid var(--accent-blue)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🏦</span>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: '700' }}>
              Applying for Commercial Merchant Credit Line with
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              {company.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-approved" style={{ fontSize: '0.72rem' }}>
            ✓ Verified Finance Institution
          </span>
        </div>
      </div>

      {/* Render the Full Application Wizard */}
      <NewApplication publicCompany={company} />
    </div>
  );
}
