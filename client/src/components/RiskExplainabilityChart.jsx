import React, { useState } from 'react';
import { computeRiskExplainabilityFactors } from '../utils/riskExplainability';

/**
 * RiskExplainabilityChart Component
 * Visual horizontal bar chart illustrating the weighted contribution of underwriting
 * factors to the calculated risk score.
 */
export default function RiskExplainabilityChart({ application }) {
  const [hoveredFactor, setHoveredFactor] = useState(null);
  const factors = computeRiskExplainabilityFactors(application);

  if (!factors || factors.length === 0) {
    return null;
  }

  // Max absolute weight for percentage scaling across bars (max 40)
  const maxWeight = Math.max(35, ...factors.map(f => f.weightAbs));

  const positiveCount = factors.filter(f => f.type === 'positive').length;
  const negativeCount = factors.filter(f => f.type === 'negative').length;

  return (
    <div className="risk-explainability-card">
      <div className="explainability-header">
        <div>
          <h3 className="explainability-title">
            📊 Risk Factor Attribution & Explainability
          </h3>
          <p className="explainability-subtitle">
            Signal breakdown illustrating how individual business, KYC, and financial parameters influenced the risk rating.
          </p>
        </div>
        <div className="explainability-badge-group">
          <span className="badge-legend badge-legend-positive">
            <span className="legend-dot dot-positive"></span>
            {positiveCount} Protective Factors (Risk-Reducing)
          </span>
          {negativeCount > 0 && (
            <span className="badge-legend badge-legend-negative">
              <span className="legend-dot dot-negative"></span>
              {negativeCount} Risk Triggers (Risk-Increasing)
            </span>
          )}
        </div>
      </div>

      <div className="explainability-bars-container">
        {factors.map((factor) => {
          const isPositive = factor.type === 'positive';
          const widthPercent = Math.min(100, Math.max(12, (factor.weightAbs / maxWeight) * 100));
          const isHovered = hoveredFactor === factor.id;

          return (
            <div
              key={factor.id}
              className={`explainability-bar-row ${isHovered ? 'row-hovered' : ''}`}
              onMouseEnter={() => setHoveredFactor(factor.id)}
              onMouseLeave={() => setHoveredFactor(null)}
            >
              {/* Left Label Column */}
              <div className="bar-row-label-col">
                <span className="factor-icon">{factor.icon}</span>
                <div className="factor-name-wrapper">
                  <span className="factor-name">{factor.name}</span>
                  <span className="factor-desc">{factor.description}</span>
                </div>
              </div>

              {/* Right Chart Bar Track Column */}
              <div className="bar-row-track-col">
                <div className="bar-track">
                  <div
                    className={`bar-fill ${isPositive ? 'bar-fill-positive' : 'bar-fill-negative'}`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="bar-fill-inner-label">
                      {isPositive ? `${factor.impact}%` : `+${factor.impact}%`}
                    </span>
                  </div>
                </div>

                {/* Clear Contribution Metric Tag */}
                <span className={`factor-impact-tag ${isPositive ? 'tag-positive' : 'tag-negative'}`}>
                  {factor.name}: {isPositive ? `${factor.impact}%` : `+${factor.impact}%`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="explainability-footer">
        <div className="footer-legend-item">
          <span className="legend-color-box box-positive"></span>
          <span><strong>Negative % (Green):</strong> Protective underwriting signal lowering credit risk</span>
        </div>
        <div className="footer-legend-item">
          <span className="legend-color-box box-negative"></span>
          <span><strong>Positive % (Red):</strong> Risk factor elevating merchant probability of default</span>
        </div>
      </div>
    </div>
  );
}
