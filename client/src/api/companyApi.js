/**
 * Company API Client
 * Wraps fetch calls to company endpoints using httpOnly cookies (credentials: 'include').
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Public listing of all active registered finance companies
 * @returns {Promise<Object>} Object containing companies array and total count
 */
export async function getPublicCompanies() {
  try {
    const res = await fetch(`${API_BASE_URL}/companies`, {
      method: 'GET'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load lending companies.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to load lending companies.');
  }
}

/**
 * Public lookup of finance company details by slug
 * @param {string} slug 
 * @returns {Promise<Object>} Company details
 */
export async function lookupCompanyBySlug(slug) {
  try {
    const res = await fetch(`${API_BASE_URL}/companies/lookup/${encodeURIComponent(slug)}`, {
      method: 'GET'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid or expired application link.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Invalid or expired application link.');
  }
}

/**
 * Retrieves logged-in finance company profile & application statistics
 * @returns {Promise<Object>} Company details and stats
 */
export async function getMyCompany() {
  try {
    const res = await fetch(`${API_BASE_URL}/companies/my-company`, {
      method: 'GET',
      credentials: 'include'
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to retrieve company profile.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to retrieve company profile.');
  }
}

/**
 * Submits public merchant application for a specific finance company
 * @param {string} slug - Company slug
 * @param {Object} payload - Application payload
 * @returns {Promise<Object>} Pipeline evaluation result
 */
export async function submitPublicApplication(slug, payload) {
  try {
    const res = await fetch(`${API_BASE_URL}/underwriting/apply-public/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const errorDetails = data.details && Array.isArray(data.details) && data.details.length > 0
        ? data.details.join(' ')
        : data.error;
      throw new Error(errorDetails || 'Application submission failed.');
    }
    return data;
  } catch (error) {
    throw new Error(error.message || 'Application submission failed.');
  }
}

/**
 * Retrieves list of current team members and pending invites for the company
 */
export async function getCompanyTeam() {
  const res = await fetch(`${API_BASE_URL}/companies/team`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve team members.');
  }
  return data;
}

/**
 * Invites a new team member by email
 */
export async function inviteTeamMember({ email, role = 'underwriter' }) {
  const res = await fetch(`${API_BASE_URL}/companies/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, role })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send invitation.');
  }
  return data;
}

/**
 * Revokes a pending team invite
 */
export async function revokeInvite(inviteId) {
  const res = await fetch(`${API_BASE_URL}/companies/invite/${inviteId}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to revoke invitation.');
  }
  return data;
}

/**
 * Validates an invite token publicly
 */
export async function validateInviteToken(token) {
  const res = await fetch(`${API_BASE_URL}/auth/invite/${encodeURIComponent(token)}`, {
    method: 'GET'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid or expired invitation link.');
  }
  return data;
}

/**
 * Accepts an invitation and registers the new underwriter
 */
export async function acceptInvite({ token, name, password }) {
  const res = await fetch(`${API_BASE_URL}/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token, name, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to accept invitation.');
  }
  return data;
}

/**
 * Super Admin: Retrieves all registered finance companies with enriched statistics
 */
export async function getSuperAdminCompanies() {
  const res = await fetch(`${API_BASE_URL}/companies/admin/all`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve platform companies.');
  }
  return data;
}

/**
 * Super Admin: Soft-deactivates/removes a finance company
 */
export async function deactivateCompany(companyId) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/${encodeURIComponent(companyId)}/deactivate`, {
    method: 'POST',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to deactivate company.');
  }
  return data;
}

/**
 * Super Admin: Reactivates a removed finance company
 */
export async function reactivateCompany(companyId) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/${encodeURIComponent(companyId)}/reactivate`, {
    method: 'POST',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reactivate company.');
  }
  return data;
}

/**
 * Super Admin: Manually provisions a new Finance Company and Admin account
 */
export async function createFinanceCompany(payload) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/create-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create finance company.');
  }
  return data;
}

/**
 * Super Admin: Retrieves list of all Super Admins and pending Super Admin invites
 */
export async function getSuperAdmins() {
  const res = await fetch(`${API_BASE_URL}/companies/admin/super-admins`, {
    method: 'GET',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load Super Admins.');
  }
  return data;
}

/**
 * Super Admin: Dispatches a new Super Admin invitation (requires current admin password)
 */
export async function inviteSuperAdmin({ email, current_admin_password }) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/invite-super-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, current_admin_password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send Super Admin invite.');
  }
  return data;
}

/**
 * Super Admin: Revokes a pending Super Admin invite
 */
export async function revokeSuperAdminInvite(inviteId) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/super-admin-invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to revoke Super Admin invite.');
  }
  return data;
}

/**
 * Super Admin: Removes an auxiliary Super Admin user
 */
export async function removeSuperAdmin(userId) {
  const res = await fetch(`${API_BASE_URL}/companies/admin/super-admins/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to remove Super Admin account.');
  }
  return data;
}



