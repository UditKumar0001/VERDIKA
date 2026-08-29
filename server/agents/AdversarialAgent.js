import { BaseAgent } from './BaseAgent.js';

/**
 * AdversarialAgent
 * Stress-tests underwriting decisions by simulating macroeconomic shocks, fraudulent edge cases,
 * synthetic anomalies, and adversarial data perturbations to identify vulnerabilities and edge-case failures.
 */
export class AdversarialAgent extends BaseAgent {
  constructor(config = {}) {
    super('AdversarialAgent', config);
  }

  /**
   * Applies adversarial stress tests and detects perturbation sensitivity.
   * @param {Object} input - Application data and baseline risk evaluation.
   * @returns {Promise<Object>} Vulnerability assessment, stress-test outcome, and robustness score.
   */
  async run(input) {
    const { merchant, features } = input;
    if (!merchant || !merchant.transaction_history) {
      return {
        agent: this.name,
        status: 'error',
        adversarialFlag: false,
        adversarialScore: 0,
        detectedPatterns: []
      };
    }

    const patterns = [];
    const history = merchant.transaction_history || [];
    if (history.length < 4) {
      return {
        agent: this.name,
        status: 'completed',
        adversarialFlag: false,
        adversarialScore: 0,
        detectedPatterns: []
      };
    }

    // Sort weekly transaction history chronologically
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    const numWeeks = sorted.length;

    // 1. Spike Before Apply: Final 2 weeks revenue vs preceding baseline
    const recent2 = sorted.slice(-2);
    const baselineRevWeeks = sorted.slice(0, numWeeks - 2);
    const recent2AvgRev = recent2.reduce((s, w) => s + (w.gross_revenue || 0), 0) / 2;
    const baselineAvgRev = baselineRevWeeks.reduce((s, w) => s + (w.gross_revenue || 0), 0) / (baselineRevWeeks.length || 1);

    if (baselineAvgRev > 0 && recent2AvgRev > 2.15 * baselineAvgRev) {
      const ratio = (recent2AvgRev / baselineAvgRev).toFixed(1);
      patterns.push({
        pattern: 'spike_before_apply',
        evidence: `Recent 2-week avg revenue (${recent2AvgRev.toFixed(0)}) spiked ${ratio}x vs baseline (${baselineAvgRev.toFixed(0)})`
      });
    }

    // 2. Refund Smoothing: Unnaturally low weekly refund variance (stddev/mean < 0.10)
    const refundCounts = sorted.map(w => w.refund_count || 0);
    const meanRefund = refundCounts.reduce((a, b) => a + b, 0) / numWeeks;
    if (meanRefund > 0) {
      const variance = refundCounts.reduce((a, v) => a + Math.pow(v - meanRefund, 2), 0) / numWeeks;
      const stddev = Math.sqrt(variance);
      const cv = stddev / meanRefund;
      if (cv < 0.10) {
        patterns.push({
          pattern: 'refund_smoothing',
          evidence: `Weekly refund count stddev/mean ratio (${cv.toFixed(3)}) is < 0.10 (artificially constant refunds)`
        });
      }
    }

    // 3. Order Value Inflation: Final 4 weeks AOV vs preceding baseline AOV (>1.8x)
    const recent4AOV = sorted.slice(-4);
    const baselineAOVWeeks = sorted.slice(0, numWeeks - 4);
    const recent4AvgAOV = recent4AOV.reduce((s, w) => s + (w.avg_order_value || 0), 0) / 4;
    const baselineAvgAOV = baselineAOVWeeks.reduce((s, w) => s + (w.avg_order_value || 0), 0) / (baselineAOVWeeks.length || 1);

    if (baselineAvgAOV > 0 && recent4AvgAOV > 1.8 * baselineAvgAOV) {
      const ratio = (recent4AvgAOV / baselineAvgAOV).toFixed(1);
      patterns.push({
        pattern: 'order_value_inflation',
        evidence: `Recent 4-week AOV (${recent4AvgAOV.toFixed(0)}) inflated ${ratio}x vs baseline (${baselineAvgAOV.toFixed(0)})`
      });
    }

    // 4. Settlement Gaming: Sharp drop in recent settlement delay AND inconsistent with payment mix (>30% Card/Netbanking)
    const recent4Settlement = sorted.slice(-4);
    const recentAvgDelay = recent4Settlement.reduce((s, w) => s + (w.settlement_delay_days || 0), 0) / 4;
    const recentCardNbPct = recent4Settlement.reduce((s, w) => s + (w.card_pct || 0) + (w.netbanking_pct || 0), 0) / 4;
    const baselineSettlementWeeks = sorted.slice(0, numWeeks - 4);
    const baselineAvgDelay = baselineSettlementWeeks.reduce((s, w) => s + (w.settlement_delay_days || 0), 0) / (baselineSettlementWeeks.length || 1);

    const isSharpDrop = recentAvgDelay < 0.30 && baselineAvgDelay > 1.0;
    const isInconsistentWithMix = recentCardNbPct > 0.30;

    if (isSharpDrop && isInconsistentWithMix) {
      patterns.push({
        pattern: 'settlement_gaming',
        evidence: `Recent settlement delay dropped to ${recentAvgDelay.toFixed(2)}d (from ${baselineAvgDelay.toFixed(2)}d) despite ${(recentCardNbPct * 100).toFixed(0)}% Card/Netbanking mix`
      });
    }

    const adversarialScore = patterns.length / 4;
    return {
      agent: this.name,
      status: 'completed',
      adversarialFlag: patterns.length > 0,
      adversarialScore,
      detectedPatterns: patterns
    };
  }
  }

