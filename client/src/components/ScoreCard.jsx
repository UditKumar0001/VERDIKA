import React from 'react';

/**
 * ScoreCard Component
 * Displays underwriting risk scores and calibration metrics.
 */
export default function ScoreCard({ score = 0, maxScore = 100, label = 'Risk Score' }) {
  return (
    <div className="score-card">
      <h3>{label}</h3>
      <div className="score-value">{score} / {maxScore}</div>
    </div>
  );
}
