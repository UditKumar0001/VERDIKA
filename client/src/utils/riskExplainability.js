/**
 * Risk Factor Explainability Attribution Helper
 * Calculates positive (risk-reducing / green) and negative (risk-increasing / red)
 * factor contributions from pipeline agent outputs and reason codes.
 */

export function computeRiskExplainabilityFactors(application) {
  if (!application) return [];

  const parseObj = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  };

  const merchantData = parseObj(application.merchant_data);
  const riskObj = parseObj(application.risk_result);
  const advObj = parseObj(application.adversarial_result);
  const bankDetails = merchantData.bank_details || {};
  const documents = merchantData.documents || {};

  const riskScore = riskObj.riskScore ?? application.riskScore ?? 0.15;
  const reasonCodes = Array.isArray(riskObj.reasonCodes) ? riskObj.reasonCodes : [];
  const reasonCodeMap = new Map();
  reasonCodes.forEach(rc => {
    if (rc.code) reasonCodeMap.set(rc.code, rc);
    if (rc.factor) reasonCodeMap.set(rc.factor, rc);
  });

  const isAdversarial = Boolean(advObj && advObj.adversarialFlag === true);
  const detectedPatterns = Array.isArray(advObj?.detectedPatterns) ? advObj.detectedPatterns : [];

  // Check document status
  const evaluateDocStatus = (docObj) => {
    if (!docObj || (!docObj.name && !docObj.verified && !docObj.isUploaded)) return 'missing';
    if (docObj.isCorrupted === true || docObj.isReadable === false) return 'corrupted';
    if (docObj.size !== undefined && Number(docObj.size) < 15 * 1024) return 'low_quality';
    return 'clear';
  };

  const gstStatus = evaluateDocStatus(documents.gst_certificate);
  const panStatus = evaluateDocStatus(documents.pan_card);
  const stmtStatus = evaluateDocStatus(documents.bank_statement);
  const hasDocIssues = gstStatus !== 'clear' || panStatus !== 'clear' || stmtStatus !== 'clear';
  const missingCount = [gstStatus, panStatus, stmtStatus].filter(s => s === 'missing').length;

  const bVer = bankDetails.bank_verification || {};
  const isBankVerified = bVer.status === 'Verified' || bankDetails.bankVerificationStatus === 'Verified' || Boolean(bankDetails.ifsc_verified);

  const factors = [];

  // 1. Document Completeness & KYC Integrity
  if (!hasDocIssues && isBankVerified) {
    factors.push({
      id: 'doc_completeness',
      name: 'Document Completeness',
      impact: -15, // -15% risk (positive/green)
      type: 'positive',
      weightAbs: 15,
      description: 'All KYC docs verified & bank account confirmed via Penny-Drop',
      icon: '🛡️'
    });
  } else if (missingCount > 0) {
    const penalty = Math.min(30, 15 + missingCount * 5);
    factors.push({
      id: 'doc_completeness',
      name: 'Document Completeness',
      impact: +penalty,
      type: 'negative',
      weightAbs: penalty,
      description: `${missingCount} required KYC documentation file(s) missing or incomplete`,
      icon: '📁'
    });
  } else if (hasDocIssues) {
    factors.push({
      id: 'doc_completeness',
      name: 'Document Quality Check',
      impact: +15,
      type: 'negative',
      weightAbs: 15,
      description: 'Resolution / page quality checks flagged document for re-upload',
      icon: '📁'
    });
  }

  // 2. Revenue Stability & Volatility
  if (reasonCodeMap.has('high_revenue_volatility')) {
    const rc = reasonCodeMap.get('high_revenue_volatility');
    const weight = Math.round((rc.weight || 0.20) * 100);
    factors.push({
      id: 'revenue_stability',
      name: 'Revenue Stability',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: rc.description || 'Elevated monthly revenue variance exceeding category benchmark',
      icon: '📈'
    });
  } else {
    factors.push({
      id: 'revenue_stability',
      name: 'Revenue Stability',
      impact: -20,
      type: 'positive',
      weightAbs: 20,
      description: 'Consistent revenue stream with low monthly coefficient of variance',
      icon: '📈'
    });
  }

  // 3. Refund Rate & Chargeback Exposure
  if (reasonCodeMap.has('refund_rate_above_benchmark')) {
    const rc = reasonCodeMap.get('refund_rate_above_benchmark');
    const weight = Math.round((rc.weight || 0.25) * 100);
    factors.push({
      id: 'refund_rate',
      name: 'Refund & Chargeback Rate',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: rc.description || 'Refund frequency exceeds allowable category baseline tolerance',
      icon: '🔄'
    });
  } else {
    factors.push({
      id: 'refund_rate',
      name: 'Refund & Chargeback Rate',
      impact: -15,
      type: 'positive',
      weightAbs: 15,
      description: 'Minimal chargebacks and refund distribution within safe tier bounds',
      icon: '🔄'
    });
  }

  // 4. Adversarial & Data Integrity Check
  if (isAdversarial) {
    const patCount = detectedPatterns.length || 1;
    const weight = Math.min(35, 20 + patCount * 5);
    factors.push({
      id: 'adversarial_check',
      name: 'Adversarial Data Integrity',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: 'Synthetic manipulation signatures / velocity gaming detected',
      icon: '🚨'
    });
  } else {
    factors.push({
      id: 'adversarial_check',
      name: 'Adversarial Data Integrity',
      impact: -15,
      type: 'positive',
      weightAbs: 15,
      description: 'Authentic entropy confirmed across transaction & settlement records',
      icon: '🔍'
    });
  }

  // 5. Settlement Timelines & Consistency
  if (reasonCodeMap.has('increasing_settlement_delay')) {
    const rc = reasonCodeMap.get('increasing_settlement_delay');
    const weight = Math.round((rc.weight || 0.15) * 100);
    factors.push({
      id: 'settlement_delay',
      name: 'Settlement Timelines',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: rc.description || 'Recent increase in payout and settlement cycle lag',
      icon: '⏳'
    });
  } else {
    factors.push({
      id: 'settlement_delay',
      name: 'Settlement Timelines',
      impact: -10,
      type: 'positive',
      weightAbs: 10,
      description: 'Standard payout intervals without abnormal settlement bottlenecks',
      icon: '⏳'
    });
  }

  // 6. Business Operating History / Track Record
  const ageMonths = merchantData.business_age_months || merchantData.businessAgeMonths || 24;
  if (reasonCodeMap.has('young_business_age') || ageMonths < 12) {
    const rc = reasonCodeMap.get('young_business_age');
    const weight = rc ? Math.round((rc.weight || 0.10) * 100) : 10;
    factors.push({
      id: 'business_age',
      name: 'Operating Track Record',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: `Newer business entity (${ageMonths} months operating history)`,
      icon: '🏢'
    });
  } else {
    factors.push({
      id: 'business_age',
      name: 'Operating Track Record',
      impact: -10,
      type: 'positive',
      weightAbs: 10,
      description: `Established business track record (${ageMonths} months operating history)`,
      icon: '🏢'
    });
  }

  // 7. Order Value Stability (if triggered)
  if (reasonCodeMap.has('declining_avg_order_value')) {
    const rc = reasonCodeMap.get('declining_avg_order_value');
    const weight = Math.round((rc.weight || 0.15) * 100);
    factors.push({
      id: 'avg_order_value',
      name: 'Ticket Size Stability',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: rc.description || 'Average order value decline over recent cycles',
      icon: '🏷️'
    });
  }

  // 8. Payment Mix Stability (if triggered)
  if (reasonCodeMap.has('unstable_payment_mix')) {
    const rc = reasonCodeMap.get('unstable_payment_mix');
    const weight = Math.round((rc.weight || 0.15) * 100);
    factors.push({
      id: 'payment_mix',
      name: 'Payment Mix Stability',
      impact: +weight,
      type: 'negative',
      weightAbs: weight,
      description: rc.description || 'Sudden shifts in payment method distributions',
      icon: '💳'
    });
  }

  // Sort: Negative/Risk-Increasing first, then by absolute weight descending
  return factors.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'negative' ? -1 : 1;
    return b.weightAbs - a.weightAbs;
  });
}
