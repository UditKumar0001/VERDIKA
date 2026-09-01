import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

function wrapAndSplitText(doc, text, maxWidth) {
  if (!text) return [];
  const clean = String(text)
    .replace(/[—–]/g, ' - ')
    .replace(/→/g, ' -> ')
    .replace(/[•●○]/g, ' - ')
    .replace(/[✓✔]/g, '[OK]')
    .replace(/([/_,-;:])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  return doc.splitTextToSize(clean, maxWidth);
}

function generateReportForTest(application, auditLogs = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 14;

  const parseObj = (d) => (typeof d === 'object' ? d : JSON.parse(d || '{}'));
  const merchantData = parseObj(application.merchant_data);
  const riskObj = parseObj(application.risk_result);
  const advObj = parseObj(application.adversarial_result);
  const bankDetails = merchantData.bank_details || {};
  const documents = merchantData.documents || {};

  const businessName = merchantData.business_name || 'High Risk Test Merchant';
  const applicationId = application.id || 'APP-TEST-HIGH-RISK';
  const gstin = merchantData.gstin || '27AAACH1234F1Z5';

  const riskScore = riskObj.riskScore ?? 0.783;
  const confidence = riskObj.confidence ?? 0.88;
  const reasonCodes = Array.isArray(riskObj.reasonCodes) ? riskObj.reasonCodes : [
    { code: 'high_revenue_volatility', description: 'Monthly revenue variance is 0.72 vs category benchmark 0.25', weight: 0.25 },
    { code: 'refund_rate_above_benchmark', description: 'Refund distribution rate is 14.5% exceeding the category tolerance of 5.2%', weight: 0.20 }
  ];

  const isAdversarial = Boolean(advObj && advObj.adversarialFlag === true);
  const detectedPatterns = Array.isArray(advObj?.detectedPatterns) ? advObj.detectedPatterns : [];

  const evaluateDocPdfStatus = (docObj, docTitle) => {
    if (!docObj || (!docObj.name && !docObj.verified && !docObj.isUploaded)) {
      return { status: 'Missing', text: '[○] Missing (Not Uploaded)', color: [220, 38, 38], title: docTitle };
    }
    return { status: 'Clear', text: `[✓] Clear (${docObj.name || 'Verified'})`, color: [5, 150, 105], title: docTitle };
  };

  const gstStatus = evaluateDocPdfStatus(documents.gst_certificate, 'GST Certificate');
  const panStatus = evaluateDocPdfStatus(documents.pan_card, 'PAN Card');
  const stmtStatus = evaluateDocPdfStatus(documents.bank_statement, 'Bank Statement');

  const allDocStatuses = [gstStatus, panStatus, stmtStatus];
  const missingDocs = allDocStatuses.filter(d => d.status === 'Missing').map(d => d.title);
  const reuploadDocs = allDocStatuses.filter(d => d.status === 'Needs Re-upload').map(d => d.title);

  const hasAccountHolder = Boolean(bankDetails.account_holder);
  const hasAccountNumber = Boolean(bankDetails.account_number);
  const hasIfsc = Boolean(bankDetails.ifsc);
  const hasBankDetails = hasAccountHolder && hasAccountNumber && hasIfsc;

  const totalRequiredDocs = 4;
  const missingTotalList = [...missingDocs];
  if (!hasBankDetails) missingTotalList.push('Bank Account Settlement Details');

  let recType = 'MANUAL_REVIEW';
  if (riskScore > 0.85 || isAdversarial) {
    recType = 'REJECT';
  } else if (missingTotalList.length > 0 || reuploadDocs.length > 0 || riskScore >= 0.25) {
    recType = 'MANUAL_REVIEW';
  } else {
    recType = 'APPROVE';
  }

  const recBadgeText = recType === 'APPROVE' ? 'RECOMMEND: APPROVE' : recType === 'REJECT' ? 'RECOMMEND: REJECT' : 'RECOMMEND: MANUAL REVIEW';
  const recColor = recType === 'APPROVE' ? [16, 185, 129] : recType === 'REJECT' ? [220, 38, 38] : [217, 119, 6];
  const recBg = recType === 'APPROVE' ? [240, 253, 244] : recType === 'REJECT' ? [254, 242, 242] : [255, 251, 235];

  const recommendationSummary = `This application cannot be auto-approved because ${missingTotalList.length} of ${totalRequiredDocs} required documents (${missingTotalList.join(', ')}) are missing, despite a favorable risk score of ${(riskScore * 100).toFixed(1)}% and a clean adversarial check. Once documents are submitted and verified, this application is likely to qualify for approval based on its financial profile.`;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('VERDIKA', marginX, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('AUTONOMOUS MULTI-AGENT UNDERWRITING PLATFORM', marginX + 26, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('UNDERWRITING EVALUATION REPORT', marginX, 22);

  y = 34;

  // Executive Recommendation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitRecSummary = wrapAndSplitText(doc, recommendationSummary, contentWidth - 14);
  const recTextHeight = splitRecSummary.length * 4.2;
  const recCardHeight = Math.max(26, 14 + recTextHeight + 4);

  doc.setFillColor(recBg[0], recBg[1], recBg[2]);
  doc.setDrawColor(recColor[0], recColor[1], recColor[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(marginX, y, contentWidth, recCardHeight, 2, 2, 'FD');
  doc.setFillColor(recColor[0], recColor[1], recColor[2]);
  doc.roundedRect(marginX, y, 4, recCardHeight, 2, 2, 'F');

  const badgeWidth = doc.getTextWidth(recBadgeText) + 8;
  doc.setFillColor(recColor[0], recColor[1], recColor[2]);
  doc.roundedRect(marginX + 8, y + 4.5, badgeWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(recBadgeText, marginX + 12, y + 9.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EXECUTIVE UNDERWRITER SYNTHESIS', marginX + 12 + badgeWidth + 4, y + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(splitRecSummary, marginX + 8, y + 16.5);
  y += recCardHeight + 6;

  // 1. Business Profile Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('1. Business & Application Profile', marginX, y);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [
      [
        { content: 'Legal Business Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: businessName, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
        { content: 'Application ID:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: applicationId, styles: { fontStyle: 'bold', textColor: [37, 99, 235] } }
      ],
      [
        { content: 'GSTIN:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: gstin, styles: { textColor: [15, 23, 42] } },
        { content: 'Application Date:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: 'Sep 01, 2026', styles: { textColor: [15, 23, 42] } }
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak', halign: 'left' }
  });

  y = doc.lastAutoTable.finalY + 6;

  // 2. Bank Settlement & Documents
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. Bank Settlement & Document Verification', marginX, y);
  doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    body: [
      [
        { content: 'Account Holder:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: 'High Risk Test Merchant', styles: { textColor: [15, 23, 42] } },
        { content: 'GST Certificate:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: gstStatus.text, styles: { textColor: gstStatus.color, fontStyle: 'bold' } }
      ],
      [
        { content: 'Account No (Masked):', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: 'XXXXXX9821', styles: { textColor: [37, 99, 235], fontStyle: 'bold' } },
        { content: 'PAN Card:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: panStatus.text, styles: { textColor: panStatus.color, fontStyle: 'bold' } }
      ],
      [
        { content: 'Bank Verification:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: 'Active & Verified (Penny-Drop)', styles: { textColor: [5, 150, 105], fontStyle: 'bold' } },
        { content: 'Bank Statement (6M):', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
        { content: stmtStatus.text, styles: { textColor: stmtStatus.color, fontStyle: 'bold' } }
      ]
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59], overflow: 'linebreak', halign: 'left' }
  });

  y = doc.lastAutoTable.finalY + 6;

  // 3. Quantitative Risk Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. Quantitative Risk Assessment & Reason Codes', marginX, y);
  doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, 14, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CALCULATED RISK SCORE', marginX + 6, y + 5);
  doc.text('MODEL CONFIDENCE', marginX + 68, y + 5);
  doc.text('RISK TIER CLASSIFICATION', marginX + 125, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`${(riskScore * 100).toFixed(1)}%`, marginX + 6, y + 11);
  doc.setTextColor(37, 99, 235);
  doc.text(`${(confidence * 100).toFixed(0)}%`, marginX + 68, y + 11);
  doc.setTextColor(15, 23, 42);
  doc.text('High Risk Tier', marginX + 125, y + 11);
  y += 18;

  reasonCodes.forEach((rc) => {
    const fullReason = `• [${rc.code}] (+${rc.weight} weight): ${rc.description}`;
    const splitReason = wrapAndSplitText(doc, fullReason, contentWidth - 8);
    const rh = splitReason.length * 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text(splitReason, marginX + 3, y);
    y += rh + 1.5;
  });

  // New Page for Agents
  doc.addPage();
  y = 16;

  // 4. Adversarial Stress Test
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('4. Adversarial Stress Test & Data Integrity Audit', marginX, y);
  doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
  y += 5;

  const advSummaryText = 'Stress tests confirmed authentic velocity patterns, non-linear revenue trends, and organic settlement timelines.';
  const splitAdvSummary = wrapAndSplitText(doc, advSummaryText, contentWidth - 12);
  const advCardHeight = Math.max(14, 8 + splitAdvSummary.length * 3.8);

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(marginX, y, contentWidth, advCardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text('Adversarial Status: CLEAN - Data Integrity Verified', marginX + 5, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(splitAdvSummary, marginX + 5, y + 9);
  y += advCardHeight + 6;

  // 5. Multi-Agent Reasoning
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('5. Multi-Agent Reasoning & Audit Trail Traces', marginX, y);
  doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
  y += 5;

  const agents = [
    {
      name: 'DataAgent',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Standardized 30 transaction cycles; extracted velocity, refund rates, and revenue variance without anomalies.',
      latency: '2ms'
    },
    {
      name: 'DocumentVerificationAgent',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Missing: GST Certificate, PAN Card, Bank Statement; Commercial bank account details (account_number, IFSC, holder_name) verified via Razorpay Penny-Drop → All flagged for manual review',
      latency: '4ms'
    },
    {
      name: 'RiskAgent',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Computed credit risk score of 78.3% with 88% confidence. High revenue volatility and elevated refund frequency detected.',
      latency: '3ms'
    },
    {
      name: 'AdversarialAgent',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Confirmed statistical entropy, natural variance, and low anomaly probability across all settlement timelines.',
      latency: '2ms'
    },
    {
      name: 'DecisionRouter',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Routed application verdict as RECOMMEND: MANUAL REVIEW in accordance with portfolio underwriting rulebook.',
      latency: '1ms'
    },
    {
      name: 'ExplainerAgent',
      role: 'Autonomous AI Pipeline Agent',
      summary: 'Application flagged for manual review due to missing KYC documents (GST Certificate, PAN Card, Bank Statement). Please provide missing verification records.',
      latency: '5ms'
    }
  ];

  agents.forEach(agent => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const textAvailableWidth = contentWidth - 12;
    const splitSummary = wrapAndSplitText(doc, agent.summary, textAvailableWidth);
    const lineHeight = 4.0;
    const textBlockHeight = splitSummary.length * lineHeight;
    const hasRole = Boolean(agent.role);
    const cardHeaderHeight = hasRole ? 14.5 : 8.0;
    const totalCardHeight = Math.max(18, cardHeaderHeight + textBlockHeight + 3.0);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentWidth, totalCardHeight, 1.5, 1.5, 'FD');
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(marginX, y, 2.5, totalCardHeight, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Agent: ${agent.name}`, marginX + 6, y + 5.0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(agent.latency, pageWidth - marginX - 4, y + 5.0, { align: 'right' });

    if (hasRole) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(agent.role, marginX + 6, y + 9.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitSummary, marginX + 6, y + cardHeaderHeight);

    y += totalCardHeight + 3.5;
  });

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Verdika AI Credit Intelligence • Confidential Underwriter Report', marginX, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }

  const outPath = path.resolve('report-High_Risk_Test_Merchant.pdf');
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('Successfully generated PDF at:', outPath);
  console.log('Total Pages:', totalPages);
}

generateReportForTest({});
