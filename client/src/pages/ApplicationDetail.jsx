import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * ApplicationDetail Page Component
 * Placeholder detailed view for an individual loan/underwriting application.
 */
export default function ApplicationDetail() {
  const { id } = useParams();

  return (
    <div className="page-container application-detail-page">
      <h1>Application Detail</h1>
      <p>Application ID: {id}</p>
      <p>Application Detail Placeholder</p>
    </div>
  );
}
