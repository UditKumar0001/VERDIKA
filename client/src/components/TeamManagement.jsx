import React, { useState, useEffect } from 'react';
import { getCompanyTeam, inviteTeamMember, revokeInvite } from '../api/companyApi';

export default function TeamManagement({ user, company }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('underwriter');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadTeamData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompanyTeam();
      setMembers(data.members || []);
      setInvites(data.invites || []);
    } catch (err) {
      setError(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail.trim()) {
      setInviteError('Please enter a valid work email.');
      return;
    }

    setIsInviting(true);
    try {
      const res = await inviteTeamMember({
        email: inviteEmail.trim(),
        role: inviteRole
      });

      setInviteSuccess(res.invite);
      setInviteEmail('');
      await loadTeamData();
    } catch (err) {
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation link?')) return;
    try {
      await revokeInvite(inviteId);
      await loadTeamData();
    } catch (err) {
      alert(err.message || 'Failed to revoke invite.');
    }
  };

  const handleCopyLink = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const formatExpiry = (isoString) => {
    if (!isoString) return '';
    try {
      const diffMs = new Date(isoString).getTime() - Date.now();
      if (diffMs <= 0) return 'Expired';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      return `${hours}h remaining`;
    } catch {
      return '';
    }
  };

  return (
    <div className="team-management-container">
      {/* Header with Invite Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>
            👥 Authorized Team Members & Underwriters
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Underwriters are added strictly via invitation. Team members can review credit applications submitted to <strong>{company?.name || 'your company'}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowInviteModal(true);
            setInviteSuccess(null);
            setInviteError(null);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.15rem' }}
        >
          <span>✉️</span>
          <span>Invite Team Member</span>
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {loading ? (
        <div className="loading-spinner-container" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
          <p>Loading company team members...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Active Members Table */}
          <div className="dashboard-card">
            <div className="card-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Active Members ({members.length})
              </h3>
            </div>

            <div className="table-responsive">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Joined Date</th>
                    <th>Security Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: m.role === 'admin' ? 'linear-gradient(135deg, #4f46e5, #06b6d4)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem'
                          }}>
                            {m.name ? m.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{m.name}</span>
                            {m.id === user?.id && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{m.email}</td>
                      <td>
                        <span className={`badge ${m.role === 'admin' ? 'badge-approved' : 'badge-review'}`} style={{ textTransform: 'capitalize' }}>
                          {m.role === 'admin' ? '👑 Admin' : '🛡️ Underwriter'}
                        </span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>{formatDate(m.createdAt || m.created_at)}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--status-approved)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          ● Active & Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invitations Table */}
          <div className="dashboard-card">
            <div className="card-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Pending Invitations ({invites.filter(i => i.status === 'pending').length})
              </h3>
            </div>

            {invites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No active or pending team invitations.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Invited Email</th>
                      <th>Assigned Role</th>
                      <th>Token Status</th>
                      <th>Sent Date</th>
                      <th>Expires In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.email}</td>
                        <td>
                          <span className="badge badge-review" style={{ textTransform: 'capitalize' }}>
                            {inv.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${inv.status === 'accepted' ? 'badge-approved' : inv.status === 'expired' ? 'badge-rejected' : 'badge-review'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.82rem' }}>{formatDate(inv.created_at)}</td>
                        <td style={{ fontSize: '0.82rem', color: inv.status === 'expired' ? 'var(--status-rejected)' : 'var(--text-dim)' }}>
                          {inv.status === 'pending' ? formatExpiry(inv.expires_at) : '—'}
                        </td>
                        <td>
                          {inv.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleCopyLink(inv.invite_link, inv.id)}
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                title="Copy invitation link"
                              >
                                {copiedId === inv.id ? '✓ Copied!' : '📋 Copy Link'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(inv.id)}
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.75rem',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: 'var(--status-rejected)',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                title="Revoke invitation"
                              >
                                ✕ Revoke
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
        >
          <div
            className="auth-card"
            style={{
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              border: '1px solid var(--accent-blue)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>✉️</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Invite Team Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {inviteSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                  Invitation Created!
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                  An invite token valid for <strong>72 hours</strong> has been generated for <strong>{inviteSuccess.email}</strong>.
                </p>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1.25rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>Direct Invite Link:</div>
                  <code style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', wordBreak: 'break-all', display: 'block' }}>
                    {inviteSuccess.invite_link}
                  </code>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleCopyLink(inviteSuccess.invite_link, 'modal')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <span>{copiedId === 'modal' ? '✓ Copied!' : '📋 Copy Invite Link'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setInviteSuccess(null);
                      setShowInviteModal(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="auth-form">
                {inviteError && <div className="auth-alert-error">{inviteError}</div>}

                <div className="form-group">
                  <label htmlFor="inviteEmail">Team Member Work Email *</label>
                  <input
                    id="inviteEmail"
                    type="email"
                    placeholder="underwriter@yourcompany.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inviteRole">Assigned Access Role</label>
                  <select
                    id="inviteRole"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="auth-select"
                  >
                    <option value="underwriter">Underwriter (Risk Queue Reviewer)</option>
                    <option value="admin">Administrator (Full Access & Team Manager)</option>
                  </select>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  🔒 <strong>Security Policy:</strong> The recipient will only be authorized to view and review credit applications belonging to <strong>{company?.name || 'your company'}</strong>.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{ width: 'auto', padding: '0.6rem 1.25rem', marginTop: 0 }}
                    disabled={isInviting}
                  >
                    {isInviting ? 'Generating Invite...' : 'Generate & Send Invite →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
