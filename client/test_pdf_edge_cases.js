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

function testPdfEdgeCases() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 14;

  const testAgents = [
    {
      name: 'DocumentVerificationAgent',
      role: 'KYC & Banking Format Integrity',
      summary: 'Missing KYC items: GST Certificate, PAN Card, Bank Statement; Quality issues: None! -> Flagged for review with extensive detail on document requirements.',
      latency: '4ms'
    },
    {
      name: 'AdversarialAgent',
      role: 'Synthetic Manipulation Stress Testing',
      summary: 'High revenue volatility / abrupt spikes detected in merchant transaction cycles (3.8x baseline standard deviation across multiple billing windows).',
      latency: '2ms'
    }
  ];

  testAgents.forEach(agent => {
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

    console.log(`[Agent: ${agent.name}] Header height: ${cardHeaderHeight}mm, Text height: ${textBlockHeight}mm, Total: ${totalCardHeight}mm`);
    console.log('Lines rendered:', splitSummary);
    y += totalCardHeight + 3.5;
  });

  const outDir = path.resolve('..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'test-edge-cases.pdf');
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('[SUCCESS] Edge case test PDF generated at:', outPath);
}

testPdfEdgeCases();
