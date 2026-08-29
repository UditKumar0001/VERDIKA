import { BaseAgent } from './BaseAgent.js';

/**
 * RiskAgent
 * Evaluates a merchant's risk using normalized contributions from all six features plus business age.
 * Each contribution is weighted so the total riskScore is naturally in [0,1].
 */
export class RiskAgent extends BaseAgent {
  constructor(config = {}) {
    super('RiskAgent', config);
  }

  /**
   * Compute risk score with per‑signal normalization, fixed weights, and calibrated confidence.
   * @param {Object} input - Output from DataAgent.
   * @returns {Promise<Object>} riskScore (0‑1), confidence (0‑1), reasonCodes.
   */
  async run(input) {
    const {
      revenueTrendSlope,
      revenueVolatility,
      refundRateVsBenchmark,
      merchantRefundRatePercent,
      categoryBenchmarkPercent,
      avgOrderValueChange,
      settlementDelayTrend,
      paymentMixStability,
      businessAgeMonths,
      category,
    } = input;

    const contributions = [];

    // 1. Revenue volatility (weight 0.20)
    if (revenueVolatility > 0.5) {
      const contrib = Math.min(1, revenueVolatility) * 0.20;
      contributions.push({
        code: 'high_revenue_volatility',
        description: `Revenue volatility is ${revenueVolatility.toFixed(3)} (threshold 0.5)`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 2. Refund rate vs benchmark (weight 0.25)
    if (refundRateVsBenchmark > 1.2) {
      const excess = refundRateVsBenchmark - 1; // e.g. 0.63 for 163%
      const norm = Math.min(1, excess / 2); // excess up to 200% maps to 1
      const contrib = norm * 0.25;
      contributions.push({
        code: 'refund_rate_above_benchmark',
        description: `Refund rate is ${merchantRefundRatePercent.toFixed(1)}% vs category benchmark ${categoryBenchmarkPercent.toFixed(1)}%`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 3. Declining average order value (weight 0.15)
    if (avgOrderValueChange < -0.2) {
      const norm = Math.min(1, Math.abs(avgOrderValueChange) / 0.5);
      const contrib = norm * 0.15;
      contributions.push({
        code: 'declining_avg_order_value',
        description: `Average order value change is ${(avgOrderValueChange * 100).toFixed(1)}% (decline)`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 4. Settlement delay increase (weight 0.15)
    if (settlementDelayTrend > 0.5) {
      const norm = Math.min(1, settlementDelayTrend / 5);
      const contrib = norm * 0.15;
      contributions.push({
        code: 'increasing_settlement_delay',
        description: `Settlement delay increased by ${settlementDelayTrend.toFixed(2)} days over recent period`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 5. Payment mix stability variance (weight 0.15)
    if (paymentMixStability > 0.02) {
      const norm = Math.min(1, paymentMixStability / 0.1);
      const contrib = norm * 0.15;
      contributions.push({
        code: 'unstable_payment_mix',
        description: `Payment mix stability variance is ${paymentMixStability.toFixed(4)} (threshold 0.02)`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 6. Extreme revenue trend slope (weight 0.10)
    if (Math.abs(revenueTrendSlope) > 5000) {
      const norm = Math.min(1, Math.abs(revenueTrendSlope) / 20000);
      const contrib = norm * 0.10;
      contributions.push({
        code: 'extreme_revenue_trend',
        description: `Revenue trend slope magnitude is ${revenueTrendSlope.toFixed(1)}`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // 7. Business age (newer businesses higher risk) (weight 0.10)
    if (businessAgeMonths !== undefined && businessAgeMonths < 12) {
      const ageFactor = (12 - businessAgeMonths) / 12; // 1 for 0 months, 0 for 12 months
      const contrib = ageFactor * 0.10;
      contributions.push({
        code: 'young_business_age',
        description: `Business age is ${businessAgeMonths} months`,
        weight: Number(contrib.toFixed(3)),
      });
    }

    // Sum weighted contributions (max 1)
    const riskScore = Number(contributions.reduce((sum, r) => sum + r.weight, 0).toFixed(3));

    // --- Calibrated Confidence Calculation ---
    // Base confidence scales from 0.50 (at midpoint 0.5) to 1.00 (at extremes 0.0 or 1.0)
    const distanceFromMid = Math.abs(riskScore - 0.5);
    let baseConfidence = 0.5 + distanceFromMid;

    // 1. Reduce confidence for features sitting near (within 20% under) their risk thresholds
    let nearThresholdPenalty = 0;
    if (revenueVolatility >= 0.40 && revenueVolatility <= 0.50) nearThresholdPenalty += 0.08;
    if (refundRateVsBenchmark >= 0.96 && refundRateVsBenchmark <= 1.20) nearThresholdPenalty += 0.08;
    if (avgOrderValueChange !== undefined && avgOrderValueChange >= -0.20 && avgOrderValueChange <= -0.16) nearThresholdPenalty += 0.08;
    if (settlementDelayTrend !== undefined && settlementDelayTrend >= 0.40 && settlementDelayTrend <= 0.50) nearThresholdPenalty += 0.08;
    if (paymentMixStability !== undefined && paymentMixStability >= 0.016 && paymentMixStability <= 0.020) nearThresholdPenalty += 0.08;

    // 2. Reduce confidence proportionally based on adversarialScore from AdversarialAgent
    const advScore = typeof input.adversarialScore === 'number'
      ? input.adversarialScore
      : (input.adv && typeof input.adv.adversarialScore === 'number'
          ? input.adv.adversarialScore
          : (input.adversarial_result ? input.adversarial_result.adversarialScore : 0));

    const advPenalty = advScore * 0.35;

    let calibratedConfidence = baseConfidence - nearThresholdPenalty - advPenalty;
    calibratedConfidence = Math.max(0.50, Math.min(0.99, calibratedConfidence));
    const confidence = Number(calibratedConfidence.toFixed(2));

    return {
      agent: this.name,
      status: 'completed',
      riskScore,
      confidence,
      reasonCodes: contributions,
    };
  }
}
