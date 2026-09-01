import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublicCompanies } from '../api/companyApi';

/**
 * Public Company Selector Page
 * Route: /apply
 * Generic entry point allowing merchants to discover and select a registered finance company to apply with.
 */
export default function CompanySelector() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCompanies() {
      try {
        setLoading(true);
        const data = await getPublicCompanies();
        if (isMounted) {
          setCompanies(data.companies || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load finance partners.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter companies based on search query
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const query = searchQuery.toLowerCase().trim();
    return companies.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const slugMatch = c.slug?.toLowerCase().includes(query);
      const taglineMatch = c.tagline?.toLowerCase().includes(query);
      return nameMatch || slugMatch || taglineMatch;
    });
  }, [companies, searchQuery]);

  // Generate distinct, appealing gradient avatars based on name
  const getAvatarGradient = (name = '') => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const getInitials = (name = '') => {
    if (!name) return 'FC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="company-selector-page">
      {/* Hero / Header Section */}
      <section className="company-selector-hero">
        <div className="company-selector-container">
          <div className="company-selector-hero-content">
            <div className="company-selector-badge">
              <span className="badge-pulse"></span>
              <span>Lending Partner Marketplace</span>
            </div>
            <h1 className="company-selector-title">
              Choose a Finance Company to <span className="text-gradient">Apply for Credit</span>
            </h1>
            <p className="company-selector-subtitle">
              Select a verified lending partner or NBFC on the Verdika network. Your application will be evaluated instantly via transparent, AI-assisted underwriting.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="company-search-wrapper">
            <div className="company-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                id="company-search-input"
                className="company-search-input"
                placeholder="Search finance partners by name (e.g. JECRC Foundation, Verdika, Apex)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="search-meta-pill">
              {!loading && (
                <span>
                  <strong>{filteredCompanies.length}</strong> {filteredCompanies.length === 1 ? 'partner' : 'partners'} available
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Listing Section */}
      <section className="company-selector-body">
        <div className="company-selector-container">
          {loading ? (
            <div className="company-grid-skeleton">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="company-card skeleton-card">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line text"></div>
                  <div className="skeleton-line text short"></div>
                  <div className="skeleton-button"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="company-error-state">
              <div className="error-icon">⚠️</div>
              <h3>Unable to Load Finance Companies</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.location.reload()}
              >
                Retry Loading
              </button>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="company-empty-state">
              <div className="empty-icon">🏢</div>
              <h3>No Lending Partners Found</h3>
              <p>
                No finance company matches "<strong>{searchQuery}</strong>". Try adjusting your search term or view all available partners.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="company-cards-grid">
              {filteredCompanies.map((comp) => {
                const initials = getInitials(comp.name);
                const avatarBg = getAvatarGradient(comp.name);

                return (
                  <div key={comp.id || comp.slug} className="company-card">
                    {/* Card Header with Avatar & Badge */}
                    <div className="company-card-header">
                      <div
                        className="company-avatar"
                        style={{ background: avatarBg }}
                      >
                        {initials}
                      </div>
                      <div className="company-badge-wrap">
                        <span className={`badge ${comp.slug === 'verdika-capital' ? 'badge-primary' : 'badge-tenant'}`}>
                          {comp.badge || 'Private Lending Tenant'}
                        </span>
                      </div>
                    </div>

                    {/* Company Info */}
                    <div className="company-card-body">
                      <h3 className="company-card-name">{comp.name}</h3>
                      <p className="company-card-tagline">
                        {comp.tagline || 'Verified institutional lending partner providing automated commercial credit underwriting.'}
                      </p>
                      <div className="company-gateway-path">
                        <span className="gateway-label">Dedicated Gateway:</span>
                        <code className="gateway-code">/apply/{comp.slug}</code>
                      </div>
                    </div>

                    {/* Card Footer with Apply Action */}
                    <div className="company-card-footer">
                      <button
                        type="button"
                        className="company-apply-btn"
                        onClick={() => navigate(`/apply/${comp.slug}`)}
                        id={`apply-btn-${comp.slug}`}
                      >
                        <span>Apply Now</span>
                        <span className="btn-arrow">→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Note */}
          <div className="company-selector-footer-hint">
            <p>
              Are you a finance company or NBFC interested in issuing credit?{' '}
              <Link to="/signup" className="hint-link">Register your organization</Link> or{' '}
              <Link to="/login" className="hint-link">Sign In to Underwriter Console</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
