import React from 'react';

/**
 * ConfidenceBadge Component
 * Displays model / agent confidence level (e.g. High, Medium, Low).
 */
export default function ConfidenceBadge({ confidence = 'Medium' }) {
  return (
    <span className={`confidence-badge confidence-${confidence.toLowerCase()}`}>
      Confidence: {confidence}
    </span>
  );
}
