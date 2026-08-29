// Utility to compute and expose category-level refund rate benchmarks.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory of this module in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const merchantsPath = path.resolve(__dirname, '..', '..', 'data', 'merchants.json');
let merchantsData = [];
try {
  const raw = fs.readFileSync(merchantsPath, 'utf-8');
  merchantsData = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load merchants data for benchmarks:', e);
}

// Compute average refund rate per category (refund_amount / gross_revenue)
const categoryRefundBenchmarks = {};
const categoryCounts = {};
for (const merchant of merchantsData) {
  const category = merchant.business_category || 'unknown';
  const history = merchant.transaction_history || [];
  let totalRefund = 0;
  let totalRevenue = 0;
  for (const rec of history) {
    totalRefund += rec.refund_amount || 0;
    totalRevenue += rec.gross_revenue || 0;
  }
  const rate = totalRevenue === 0 ? 0 : totalRefund / totalRevenue;
  if (!categoryCounts[category]) {
    categoryCounts[category] = 0;
    categoryRefundBenchmarks[category] = 0;
  }
  categoryCounts[category] += 1;
  categoryRefundBenchmarks[category] += rate;
}
for (const cat in categoryRefundBenchmarks) {
  categoryRefundBenchmarks[cat] = categoryRefundBenchmarks[cat] / categoryCounts[cat];
}

export { categoryRefundBenchmarks };
