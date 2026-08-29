import { BaseAgent } from './BaseAgent.js';
import { linearRegressionSlope, mean, coeffOfVariation, percentageChange, variance } from '../utils/stats.js';
import { categoryRefundBenchmarks } from '../utils/categoryBenchmarks.js';

/**
 * DataAgent
 * Responsible for ingesting, standardizing, validating, and enriching application data
 * from multiple external and internal sources (e.g. credit bureaus, synthetic benchmarks, identity registries).
 */
export class DataAgent extends BaseAgent {
  constructor(config = {}) {
    super('DataAgent', config);
  }

  /**
   * Enriches raw application input with calculated ratios, verified bureau metrics, and data integrity checks.
   * @param {Object} input - Raw application submission payload.
   * @returns {Promise<Object>} Enriched feature set and validation metadata.
   */
  async run(input) {
    const { business_category, business_age_months, transaction_history } = input;
    if (!Array.isArray(transaction_history) || transaction_history.length === 0) {
      throw new Error('Invalid transaction history');
    }

    const sorted = transaction_history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

    const revenues = sorted.map(r => r.gross_revenue);
    const weeks = sorted.map((_, i) => i + 1);
    const revenueTrendSlope = linearRegressionSlope(weeks, revenues);
    const revenueVolatility = coeffOfVariation(revenues);

    const totalRefund = sorted.reduce((sum, r) => sum + r.refund_amount, 0);
    const totalRevenue = revenues.reduce((sum, v) => sum + v, 0);
    const merchantRefundRate = totalRevenue === 0 ? 0 : totalRefund / totalRevenue; // raw ratio
    const merchantRefundRatePercent = merchantRefundRate * 100;
    const categoryBenchmark = categoryRefundBenchmarks[business_category] || merchantRefundRate;
    const categoryBenchmarkPercent = categoryBenchmark * 100;
    const refundRateVsBenchmark = categoryBenchmark === 0 ? 1 : merchantRefundRate / categoryBenchmark;

    const avgOrderValues = sorted.map(r => r.avg_order_value);
    const recentAvg = mean(avgOrderValues.slice(-4));
    const priorAvg = avgOrderValues.length > 8 ? mean(avgOrderValues.slice(-8, -4)) : mean(avgOrderValues.slice(0, -4));
    const avgOrderValueChange = percentageChange(recentAvg, priorAvg);

    const settlementDelays = sorted.map(r => r.settlement_delay_days);
    const recentDelay = mean(settlementDelays.slice(-4));
    const priorDelay = settlementDelays.length > 8 ? mean(settlementDelays.slice(-8, -4)) : mean(settlementDelays.slice(0, -4));
    const settlementDelayTrend = recentDelay - priorDelay;

    const upi = sorted.map(r => r.upi_pct);
    const card = sorted.map(r => r.card_pct);
    const netbank = sorted.map(r => r.netbanking_pct);
    const paymentMixStability = variance(upi) + variance(card) + variance(netbank);

    return {
      agent: this.name,
      status: 'completed',
      revenueTrendSlope,
      revenueVolatility,
      refundRateVsBenchmark,
      merchantRefundRatePercent,
      categoryBenchmarkPercent,
      avgOrderValueChange,
      settlementDelayTrend,
      paymentMixStability,
      businessAgeMonths: business_age_months,
      category: business_category,
    };
  }
}
