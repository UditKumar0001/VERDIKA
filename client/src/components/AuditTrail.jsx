import React from 'react';

/**
 * AuditTrail Component
 * Renders the chronological multi-agent evaluation audit logs for an underwriting decision.
 */
export default function AuditTrail({ logs = [] }) {
  return (
    <div className="audit-trail">
      <h4>Agent Execution & Audit Trail</h4>
      {logs.length === 0 ? (
        <p>No audit records available.</p>
      ) : (
        <div className="audit-logs">
          {logs.map((log, index) => (
            <div key={index} className="audit-log-item">
              <span className="log-agent">{log.agentName}</span>
              <span className="log-timestamp">{log.timestamp}</span>
              <p className="log-summary">{log.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
