import { BaseAgent } from './BaseAgent.js';

/**
 * DocumentVerificationAgent
 * Validates completeness, format compliance, and DOCUMENT QUALITY (resolution, size, readability)
 * of submitted KYC & banking documents.
 */
export class DocumentVerificationAgent extends BaseAgent {
  constructor(config = {}) {
    super('DocumentVerificationAgent', config);
  }

  /**
   * Executes document completeness, format integrity, and quality validation.
   * @param {Object} input - Raw merchant application submission payload.
   * @returns {Promise<Object>} Verification status, document quality breakdown, and reason codes.
   */
  async run(input) {
    const rawData = input || {};
    const merchantData = rawData.merchant_data || rawData;
    const documents = merchantData.documents || {};
    const bankDetails = merchantData.bank_details || {};
    const gstin = (merchantData.gstin || '').trim().toUpperCase();

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const reasonCodes = [];
    const missingItems = [];
    const qualityIssueItems = [];
    const formatIssues = [];
    let isFormatValid = true;

    // Evaluates a single document object for presence, format, and QUALITY
    const evaluateDocQuality = (docObj, docKey, docTitle, allowedExts = allowedExtensions) => {
      // 1. Missing Check
      if (!docObj || (!docObj.name && !docObj.verified && !docObj.isUploaded)) {
        missingItems.push(docTitle);
        reasonCodes.push({
          code: `DOC_MISSING_${docKey.toUpperCase()}`,
          description: `${docTitle} missing`,
          weight: docKey === 'bank_statement' ? 0.20 : 0.15
        });
        return {
          status: 'Missing',
          reason: 'Document not uploaded',
          qualityPassed: false
        };
      }

      const name = docObj.name || `${docKey}.pdf`;
      const ext = ('.' + name.split('.').pop()).toLowerCase();
      const isExtValid = allowedExts.includes(ext);

      // 2. Format / File Extension Check
      if (!isExtValid) {
        formatIssues.push(`${docTitle} invalid file format (${ext || 'unknown'})`);
        reasonCodes.push({
          code: 'DOC_INVALID_FILE_TYPE',
          description: `${docTitle} invalid file format (${ext || 'unknown'}). Allowed: ${allowedExts.join(', ')}`,
          weight: 0.10
        });
        isFormatValid = false;
        return {
          status: 'Needs Re-upload',
          reason: `Unsupported file format (${ext})`,
          qualityPassed: false
        };
      }

      const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png' || (docObj.type && docObj.type.startsWith('image/'));
      const isPdf = ext === '.pdf' || (docObj.type && docObj.type === 'application/pdf');
      const sizeBytes = docObj.size !== undefined ? Number(docObj.size) : null;
      const width = docObj.width !== undefined ? Number(docObj.width) : null;
      const isCorrupted = docObj.isCorrupted === true || docObj.isReadable === false;

      // 3. Corruption Check
      if (isCorrupted) {
        qualityIssueItems.push(`${docTitle} unreadable or corrupted`);
        reasonCodes.push({
          code: `DOC_QUALITY_${docKey.toUpperCase()}_CORRUPTED`,
          description: `${docTitle} ${isPdf ? 'PDF' : 'file'} appears corrupted or unreadable`,
          weight: 0.20
        });
        return {
          status: 'Needs Re-upload',
          reason: `${docTitle} appears corrupted or unreadable`,
          qualityPassed: false
        };
      }

      // 4. Image Quality Checks (Resolution & File Size)
      if (isImage) {
        // Check image width / resolution
        if (width !== null && width < 600) {
          qualityIssueItems.push(`${docTitle} low resolution (${width}px wide)`);
          reasonCodes.push({
            code: `DOC_QUALITY_${docKey.toUpperCase()}_LOW_RES`,
            description: `${docTitle} image quality too low — request clearer copy`,
            weight: 0.15
          });
          return {
            status: 'Needs Re-upload',
            reason: `Low Resolution (${width}px) — may be illegible (min 600px width)`,
            qualityPassed: false
          };
        }

        // Check suspiciously small image file size (<20KB)
        if (sizeBytes !== null && sizeBytes > 0 && sizeBytes < 20 * 1024) {
          const kbSize = (sizeBytes / 1024).toFixed(1);
          qualityIssueItems.push(`${docTitle} file size unusually small (${kbSize}KB)`);
          reasonCodes.push({
            code: `DOC_QUALITY_${docKey.toUpperCase()}_TOO_SMALL`,
            description: `${docTitle} file size unusually small (${kbSize}KB) — possible blank or blurry scan`,
            weight: 0.15
          });
          return {
            status: 'Needs Re-upload',
            reason: `Possible quality issue — file size unusually small (${kbSize}KB < 20KB)`,
            qualityPassed: false
          };
        }
      }

      // 5. PDF Quality Checks (Page Count & Suspicious Size)
      if (isPdf) {
        if (docObj.pageCount !== undefined && Number(docObj.pageCount) === 0) {
          qualityIssueItems.push(`${docTitle} empty PDF`);
          reasonCodes.push({
            code: `DOC_QUALITY_${docKey.toUpperCase()}_EMPTY_PDF`,
            description: `${docTitle} PDF appears empty or has no readable pages`,
            weight: 0.20
          });
          return {
            status: 'Needs Re-upload',
            reason: 'Unreadable or corrupted PDF (0 pages)',
            qualityPassed: false
          };
        }

        // Check suspiciously small PDF (<10KB)
        if (sizeBytes !== null && sizeBytes > 0 && sizeBytes < 10 * 1024) {
          const kbSize = (sizeBytes / 1024).toFixed(1);
          qualityIssueItems.push(`${docTitle} PDF unusually small (${kbSize}KB)`);
          reasonCodes.push({
            code: `DOC_QUALITY_${docKey.toUpperCase()}_TOO_SMALL`,
            description: `${docTitle} PDF appears corrupted or unreadable (${kbSize}KB)`,
            weight: 0.15
          });
          return {
            status: 'Needs Re-upload',
            reason: `Unreadable or corrupted PDF (unusually small: ${kbSize}KB < 10KB)`,
            qualityPassed: false
          };
        }
      }

      // If passed all presence, format, and quality checks
      return {
        status: 'Clear',
        reason: 'Passed all completeness and quality checks',
        qualityPassed: true,
        details: {
          name,
          size: docObj.sizeFormatted || (sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : 'Verified'),
          type: ext.toUpperCase()
        }
      };
    };

    // Evaluate each required KYC Document
    const documentStatuses = {
      gst_certificate: evaluateDocQuality(documents.gst_certificate, 'gst', 'GST Certificate', ['.pdf', '.jpg', '.jpeg', '.png']),
      pan_card: evaluateDocQuality(documents.pan_card, 'pan', 'PAN Card', ['.pdf', '.jpg', '.jpeg', '.png']),
      bank_statement: evaluateDocQuality(documents.bank_statement, 'bank_statement', 'Bank Statement', ['.pdf'])
    };

    // Bank Details Completeness Check
    const hasAccountHolder = Boolean(bankDetails.account_holder && bankDetails.account_holder.trim().length > 0);
    const hasAccountNumber = Boolean(bankDetails.account_number && String(bankDetails.account_number).trim().length > 0);
    const hasIfsc = Boolean(bankDetails.ifsc && bankDetails.ifsc.trim().length > 0);
    const hasBankDetails = hasAccountHolder && hasAccountNumber && hasIfsc;

    if (!hasBankDetails) {
      missingItems.push('Bank Account Details');
      reasonCodes.push({
        code: 'DOC_MISSING_BANK_DETAILS',
        description: 'Commercial Bank Settlement Details incomplete',
        weight: 0.15
      });
    }

    // PAN & IFSC Format Checks
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    let panToValidate = '';
    if (merchantData.pan) {
      panToValidate = merchantData.pan.trim().toUpperCase();
    } else if (gstin.length >= 12) {
      panToValidate = gstin.slice(2, 12);
    }

    if (panToValidate && !panRegex.test(panToValidate)) {
      formatIssues.push('PAN format invalid');
      reasonCodes.push({
        code: 'DOC_INVALID_PAN_FORMAT',
        description: `PAN format invalid (${panToValidate})`,
        weight: 0.10
      });
      isFormatValid = false;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (bankDetails.ifsc) {
      const ifscClean = bankDetails.ifsc.trim().toUpperCase();
      if (!ifscRegex.test(ifscClean)) {
        formatIssues.push('IFSC format invalid');
        reasonCodes.push({
          code: 'DOC_INVALID_IFSC_FORMAT',
          description: `IFSC format invalid (${ifscClean})`,
          weight: 0.10
        });
        isFormatValid = false;
      }
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Zz][0-9A-Z]{1}$/;
    if (gstin && !gstinRegex.test(gstin)) {
      formatIssues.push('GSTIN format invalid');
      reasonCodes.push({
        code: 'DOC_INVALID_GSTIN_FORMAT',
        description: 'GSTIN format does not match standard 15-character pattern',
        weight: 0.10
      });
      isFormatValid = false;
    }

    // Overall Status Computation
    const hasMissing = missingItems.length > 0 || !hasBankDetails;
    const hasQualityIssues = qualityIssueItems.length > 0 || Object.values(documentStatuses).some((d) => d.status === 'Needs Re-upload');

    let status = 'Verified';
    if (hasMissing) {
      status = 'Incomplete';
    } else if (hasQualityIssues) {
      status = 'Needs Review';
    } else if (!isFormatValid) {
      status = 'Invalid Format';
    }

    if (status === 'Verified') {
      reasonCodes.push({
        code: 'KYC_DOCS_VERIFIED',
        description: 'All KYC documents verified with clear quality',
        weight: 0.0
      });
    }

    let summary = 'All KYC documents and commercial bank details verified with clear quality.';
    if (status === 'Incomplete') {
      const missingStr = missingItems.length > 0 ? `Missing: ${missingItems.join(', ')}` : '';
      const qualityStr = qualityIssueItems.length > 0 ? `Quality issues: ${qualityIssueItems.join(', ')}` : '';
      const combined = [missingStr, qualityStr].filter(Boolean).join('; ');
      summary = `${combined} → All flagged for manual review`;
    } else if (status === 'Needs Review') {
      summary = `Quality issues: ${qualityIssueItems.join(', ')} → Needs Re-upload / Manual Review`;
    } else if (status === 'Invalid Format') {
      summary = `Format issues: ${formatIssues.join(', ')} → Requires manual verification`;
    }

    const confidence = status === 'Verified' ? 0.95 : 0.65;

    return {
      agent: this.name,
      status,
      verified: status === 'Verified',
      confidence,
      documentStatuses,
      reasonCodes,
      summary,
      checks: {
        completeness: {
          gstCertificate: documentStatuses.gst_certificate.status !== 'Missing',
          panCard: documentStatuses.pan_card.status !== 'Missing',
          bankStatement: documentStatuses.bank_statement.status !== 'Missing',
          bankDetails: hasBankDetails
        },
        quality: {
          gstClear: documentStatuses.gst_certificate.status === 'Clear',
          panClear: documentStatuses.pan_card.status === 'Clear',
          bankStatementClear: documentStatuses.bank_statement.status === 'Clear'
        },
        format: {
          panValid: Boolean(panToValidate && panRegex.test(panToValidate)),
          ifscValid: Boolean(bankDetails.ifsc && ifscRegex.test(bankDetails.ifsc.trim().toUpperCase())),
          gstinValid: Boolean(gstin && gstinRegex.test(gstin)),
          fileTypesValid: isFormatValid
        }
      }
    };
  }
}
