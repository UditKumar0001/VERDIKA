import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { submitApplyApplication, validateBankAccountApi } from '../api/applicationApi';
import { submitPublicApplication } from '../api/companyApi';

// Pre-packaged realistic sample datasets for instant demo testing
const SAMPLE_PRESETS = {
  auto_approve: {
    label: 'Healthy Merchant (Auto-Approve Demo)',
    business_name: 'Sunrise Digital Solutions Pvt Ltd',
    business_category: 'electronics',
    gstin: '27AAACG1234F1Z5',
    registration_date: '2022-03-15',
    business_age_months: 48,
    loan_amount: 500000,
    loan_tenure_months: 12,
    bank_details: {
      account_holder: 'Sunrise Digital Solutions Pvt Ltd',
      account_number: '50200084729103',
      ifsc: 'HDFC0000060',
      bank_name: 'HDFC Bank',
      branch: 'Fort, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      ifsc_verified: true
    },
    documents: {
      gst_certificate: {
        name: 'Sunrise_GST_Certificate.pdf',
        size: 1420000,
        sizeFormatted: '1.4 MB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      },
      pan_card: {
        name: 'Sunrise_PAN_Card.png',
        size: 780000,
        sizeFormatted: '780 KB',
        type: 'image/png',
        isUploaded: true,
        progress: 100
      },
      bank_statement: {
        name: 'HDFC_Bank_Statement_6M.pdf',
        size: 3100000,
        sizeFormatted: '3.1 MB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      }
    },
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 85 + (i % 5) * 3,
      gross_revenue: 425000 + i * 5000,
      avg_order_value: 5000 + (i % 3) * 50,
      refund_count: (i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0)),
      refund_amount: (i % 3 === 0 ? 10000 : (i % 2 === 0 ? 5000 : 0)),
      chargeback_count: 0,
      upi_pct: 0.55,
      card_pct: 0.35,
      netbanking_pct: 0.10,
      settlement_delay_days: 1.2
    }))
  },

  auto_reject: {
    label: 'High Risk Merchant (Auto-Reject Demo)',
    business_name: 'Metro Wholesale Apparel Traders',
    business_category: 'apparel',
    gstin: '27AABCM5678H1Z2',
    registration_date: '2026-06-01',
    business_age_months: 2,
    loan_amount: 3000000,
    loan_tenure_months: 24,
    bank_details: {
      account_holder: 'Metro Wholesale Apparel Traders',
      account_number: '91820491823901',
      ifsc: 'SBIN0000691',
      bank_name: 'State Bank of India',
      branch: 'Mumbai Main Branch',
      city: 'Mumbai',
      state: 'Maharashtra',
      ifsc_verified: true
    },
    documents: {
      gst_certificate: {
        name: 'Metro_GST_Registration.pdf',
        size: 890000,
        sizeFormatted: '890 KB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      },
      pan_card: {
        name: 'Metro_Company_PAN.jpg',
        size: 620000,
        sizeFormatted: '620 KB',
        type: 'image/jpeg',
        isUploaded: true,
        progress: 100
      },
      bank_statement: {
        name: 'SBI_Statement_Q1.pdf',
        size: 2800000,
        sizeFormatted: '2.8 MB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      }
    },
    transaction_history: [
      {
        date: '2026-02-01',
        transaction_count: 500,
        gross_revenue: 1000000,
        avg_order_value: 2000,
        refund_count: 350,
        refund_amount: 700000,
        chargeback_count: 15,
        upi_pct: 0.9,
        card_pct: 0.05,
        netbanking_pct: 0.05,
        settlement_delay_days: 8.0
      },
      {
        date: '2026-02-15',
        transaction_count: 100,
        gross_revenue: 50000,
        avg_order_value: 500,
        refund_count: 80,
        refund_amount: 40000,
        chargeback_count: 10,
        upi_pct: 0.1,
        card_pct: 0.8,
        netbanking_pct: 0.1,
        settlement_delay_days: 15.0
      },
      {
        date: '2026-03-01',
        transaction_count: 20,
        gross_revenue: 5000,
        avg_order_value: 250,
        refund_count: 18,
        refund_amount: 4500,
        chargeback_count: 5,
        upi_pct: 0.5,
        card_pct: 0.2,
        netbanking_pct: 0.3,
        settlement_delay_days: 20.0
      }
    ]
  },

  route_to_human: {
    label: 'Borderline Case (Route to Human Demo)',
    business_name: 'Kalyan Supermart & Provision',
    business_category: 'grocery',
    gstin: '27AABCK9012K1Z8',
    registration_date: '2024-01-20',
    business_age_months: 28,
    loan_amount: 1500000,
    loan_tenure_months: 18,
    bank_details: {
      account_holder: 'Kalyan Supermart & Provision',
      account_number: '00040501839210',
      ifsc: 'ICIC0000004',
      bank_name: 'ICICI Bank',
      branch: 'Nariman Point, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      ifsc_verified: true
    },
    documents: {
      gst_certificate: {
        name: 'Kalyan_GSTIN_Doc.pdf',
        size: 1100000,
        sizeFormatted: '1.1 MB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      },
      pan_card: {
        name: 'Kalyan_Proprietor_PAN.png',
        size: 940000,
        sizeFormatted: '940 KB',
        type: 'image/png',
        isUploaded: true,
        progress: 100
      },
      bank_statement: {
        name: 'ICICI_Current_Account_Statement.pdf',
        size: 4200000,
        sizeFormatted: '4.2 MB',
        type: 'application/pdf',
        isUploaded: true,
        progress: 100
      }
    },
    transaction_history: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      transaction_count: 180 + (i % 7) * 8 - (i % 3) * 12,
      gross_revenue: 190000 + (i % 5) * 15000 - (i % 2) * 20000,
      avg_order_value: 1050 + (i % 4) * 30,
      refund_count: 4 + (i % 3),
      refund_amount: 4200,
      chargeback_count: 0,
      upi_pct: 0.65,
      card_pct: 0.25,
      netbanking_pct: 0.10,
      settlement_delay_days: 1.5
    }))
  }
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const maskAccountNumber = (accNo) => {
  if (!accNo) return '••••••••••••';
  const clean = String(accNo).trim();
  if (clean.length <= 4) return clean;
  const maskedLength = clean.length - 4;
  return 'X'.repeat(maskedLength) + clean.slice(-4);
};

export const calculateEmi = (principal, tenureMonths, annualRatePct = 14) => {
  const P = Number(principal) || 0;
  const n = Number(tenureMonths) || 12;
  if (P <= 0 || n <= 0) return { emi: 0, totalPayable: 0, totalInterest: 0 };
  const r = (annualRatePct / 12) / 100;
  const emi = Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const totalPayable = emi * n;
  const totalInterest = Math.max(0, totalPayable - P);
  return { emi, totalPayable, totalInterest };
};

export default function NewApplication({ publicCompany = null }) {
  const navigate = useNavigate();

  // Wizard Step: 1 = Business Info, 2 = Bank Details, 3 = Document Uploads, 4 = Review & Submit
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Business Profile & Loan Request
  const [formData, setFormData] = useState({
    business_name: '',
    business_category: 'electronics',
    gstin: '',
    registration_date: '',
    business_age_months: '',
    loan_amount: '500000',
    loan_tenure_months: '12'
  });

  // Step 2: Bank Details
  const [bankData, setBankData] = useState({
    account_holder: '',
    account_number: '',
    ifsc: '',
    bank_name: '',
    branch: '',
    city: '',
    state: '',
    micr: '',
    ifsc_verified: false,
    ifsc_loading: false,
    ifsc_error: null
  });

  const [bankValidationErrors, setBankValidationErrors] = useState({});

  // Razorpay Fund Account Validation (Penny-Drop) state
  const [bankVerification, setBankVerification] = useState({
    status: 'Not Attempted', // 'Verified' | 'Failed' | 'Name Mismatch' | 'Not Attempted'
    registeredName: '',
    referenceId: '',
    message: '',
    loading: false,
    error: null
  });

  // Step 3: Document Uploads
  const [documents, setDocuments] = useState({
    gst_certificate: null,
    pan_card: null,
    bank_statement: null
  });

  const [documentErrors, setDocumentErrors] = useState({});

  // File input refs for trigger clicks
  const gstInputRef = useRef(null);
  const panInputRef = useRef(null);
  const bankStmtInputRef = useRef(null);

  // Transaction history & Presets
  const [txHistory, setTxHistory] = useState(null);
  const [activePreset, setActivePreset] = useState(null);

  // Submission pipeline state
  const [submitting, setSubmitting] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [error, setError] = useState(null);

  // Result state after submission
  const [result, setResult] = useState(null);

  // --- Step 1 Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Step 2 Bank Details Handlers ---
  const handleAccountHolderChange = (e) => {
    setBankData((prev) => ({ ...prev, account_holder: e.target.value }));
    if (bankValidationErrors.account_holder) {
      setBankValidationErrors((prev) => ({ ...prev, account_holder: null }));
    }
  };

  const handleAccountNumberChange = (e) => {
    const rawVal = e.target.value;
    // Strictly numeric validation
    const numericOnly = rawVal.replace(/\D/g, '');
    
    setBankData((prev) => ({ ...prev, account_number: numericOnly }));

    if (rawVal !== numericOnly) {
      setBankValidationErrors((prev) => ({
        ...prev,
        account_number: 'Only numeric digits (0-9) are allowed in account number.'
      }));
    } else {
      setBankValidationErrors((prev) => ({ ...prev, account_number: null }));
    }
  };

  const lookupIfsc = async (code) => {
    const cleanCode = code.trim().toUpperCase();
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(cleanCode)) {
      setBankData((prev) => ({
        ...prev,
        ifsc_verified: false,
        ifsc_loading: false,
        ifsc_error: cleanCode.length === 11 ? 'Invalid IFSC format. Must be 4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234).' : null
      }));
      return;
    }

    setBankData((prev) => ({
      ...prev,
      ifsc_loading: true,
      ifsc_error: null
    }));

    try {
      const res = await fetch(`https://ifsc.razorpay.com/${cleanCode}`);
      if (!res.ok) {
        throw new Error('IFSC code not found in RBI registry.');
      }
      const data = await res.json();
      setBankData((prev) => ({
        ...prev,
        bank_name: data.BANK || '',
        branch: data.BRANCH || '',
        city: data.CITY || data.CENTRE || '',
        state: data.STATE || '',
        micr: data.MICR || '',
        ifsc_verified: true,
        ifsc_loading: false,
        ifsc_error: null
      }));
      setBankValidationErrors((prev) => ({ ...prev, ifsc: null, bank_name: null }));
    } catch (err) {
      setBankData((prev) => ({
        ...prev,
        bank_name: '',
        branch: '',
        city: '',
        state: '',
        micr: '',
        ifsc_verified: false,
        ifsc_loading: false,
        ifsc_error: err.message || 'Failed to fetch bank details for this IFSC.'
      }));
    }
  };

  const handleIfscChange = (e) => {
    const rawVal = e.target.value.toUpperCase().slice(0, 11);
    setBankData((prev) => ({ ...prev, ifsc: rawVal }));

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (rawVal.length === 11) {
      if (ifscRegex.test(rawVal)) {
        lookupIfsc(rawVal);
      } else {
        setBankData((prev) => ({
          ...prev,
          ifsc_verified: false,
          ifsc_error: 'Invalid IFSC format. Expected 4 letters + 0 + 6 alphanumeric.'
        }));
      }
    } else {
      setBankData((prev) => ({
        ...prev,
        ifsc_verified: false,
        ifsc_error: null,
        bank_name: prev.ifsc_verified ? '' : prev.bank_name,
        branch: prev.ifsc_verified ? '' : prev.branch
      }));
    }
  };

  const handleBankNameChange = (e) => {
    setBankData((prev) => ({ ...prev, bank_name: e.target.value }));
  };

  // --- Razorpay Fund Account Validation (Penny-Drop) Handler ---
  const triggerBankVerification = async () => {
    const errors = {};
    if (!bankData.account_holder?.trim()) errors.account_holder = 'Account Holder Name is required.';
    if (!bankData.account_number?.trim()) errors.account_number = 'Account Number is required.';
    if (!bankData.ifsc?.trim()) errors.ifsc = 'IFSC Code is required.';

    if (Object.keys(errors).length > 0) {
      setBankValidationErrors(errors);
      return false;
    }

    setBankVerification((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await validateBankAccountApi({
        account_number: bankData.account_number,
        ifsc: bankData.ifsc,
        account_holder: bankData.account_holder
      });

      setBankVerification({
        status: res.status || 'Verified',
        registeredName: res.registeredName || bankData.account_holder,
        referenceId: res.referenceId || '',
        message: res.message || '',
        loading: false,
        error: res.status === 'Failed' ? (res.message || 'Validation failed') : null
      });

      return res.status === 'Verified';
    } catch (err) {
      setBankVerification({
        status: 'Failed',
        registeredName: '',
        referenceId: '',
        message: err.message || 'Penny-drop verification failed',
        loading: false,
        error: err.message || 'Penny-drop verification failed'
      });
      return false;
    }
  };

  // --- Step 3 Document Upload Handlers ---
  const handleFileSelect = (docKey, file, allowedTypes, maxMB) => {
    if (!file) return;

    setDocumentErrors((prev) => ({ ...prev, [docKey]: null }));

    // 1. Max size validation (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setDocumentErrors((prev) => ({
        ...prev,
        [docKey]: `File exceeds maximum allowed size of ${maxMB}MB (${formatBytes(file.size)}).`
      }));
      return;
    }

    // 2. Type validation
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    const isTypeValid = allowedTypes.some((ext) => ext.toLowerCase() === fileExt);
    if (!isTypeValid) {
      setDocumentErrors((prev) => ({
        ...prev,
        [docKey]: `Unsupported file type (${fileExt}). Allowed formats: ${allowedTypes.join(', ')}.`
      }));
      return;
    }

    // 3. Create preview / local URL
    let previewUrl = null;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    // 4. Simulate realistic upload progress
    setDocuments((prev) => ({
      ...prev,
      [docKey]: {
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: file.type || fileExt,
        previewUrl,
        progress: 30,
        isUploading: true,
        isUploaded: false
      }
    }));

    setTimeout(() => {
      setDocuments((prev) => {
        if (!prev[docKey]) return prev;
        return {
          ...prev,
          [docKey]: {
            ...prev[docKey],
            progress: 80
          }
        };
      });
    }, 200);

    setTimeout(() => {
      setDocuments((prev) => {
        if (!prev[docKey]) return prev;
        return {
          ...prev,
          [docKey]: {
            ...prev[docKey],
            progress: 100,
            isUploading: false,
            isUploaded: true
          }
        };
      });
    }, 450);
  };

  const handleRemoveDocument = (docKey) => {
    setDocuments((prev) => ({ ...prev, [docKey]: null }));
    setDocumentErrors((prev) => ({ ...prev, [docKey]: null }));
  };

  // --- Preset Loader ---
  const handleLoadSample = (presetKey) => {
    const preset = SAMPLE_PRESETS[presetKey];
    if (!preset) return;

    setFormData({
      business_name: preset.business_name,
      business_category: preset.business_category,
      gstin: preset.gstin,
      registration_date: preset.registration_date,
      business_age_months: preset.business_age_months,
      loan_amount: String(preset.loan_amount || 500000),
      loan_tenure_months: String(preset.loan_tenure_months || 12)
    });

    if (preset.bank_details) {
      setBankData({
        account_holder: preset.bank_details.account_holder,
        account_number: preset.bank_details.account_number,
        ifsc: preset.bank_details.ifsc,
        bank_name: preset.bank_details.bank_name,
        branch: preset.bank_details.branch,
        city: preset.bank_details.city || 'Mumbai',
        state: preset.bank_details.state || 'Maharashtra',
        micr: preset.bank_details.micr || '',
        ifsc_verified: true,
        ifsc_loading: false,
        ifsc_error: null
      });
    }

    if (preset.documents) {
      setDocuments({
        gst_certificate: preset.documents.gst_certificate ? { ...preset.documents.gst_certificate } : null,
        pan_card: preset.documents.pan_card ? { ...preset.documents.pan_card } : null,
        bank_statement: preset.documents.bank_statement ? { ...preset.documents.bank_statement } : null
      });
    }

    setTxHistory(preset.transaction_history);
    setActivePreset(presetKey);
    setError(null);
    setBankValidationErrors({});
    setDocumentErrors({});
  };

  // --- Step Navigation & Validation ---
  const validateStep1 = () => {
    if (!formData.business_name.trim()) {
      setError('Please provide a business legal name.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!bankData.account_holder.trim()) {
      errors.account_holder = 'Account Holder Name is required.';
    }
    if (!bankData.account_number.trim()) {
      errors.account_number = 'Account Number is required.';
    } else if (!/^\d{9,18}$/.test(bankData.account_number.trim())) {
      errors.account_number = 'Account Number must contain between 9 and 18 digits.';
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!bankData.ifsc.trim()) {
      errors.ifsc = 'IFSC Code is required.';
    } else if (!ifscRegex.test(bankData.ifsc.trim())) {
      errors.ifsc = 'Invalid IFSC format (e.g. HDFC0001234).';
    }

    if (!bankData.bank_name.trim()) {
      errors.bank_name = 'Bank Name is required.';
    }

    setBankValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please complete all required bank details correctly.');
      return false;
    }

    setError(null);
    return true;
  };

  const validateStep3 = () => {
    setError(null);
    return true;
  };

  const goToNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => Math.min(4, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevStep = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Final Submit Handler ---
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setPipelineStep(1);

    // Multi-agent visualization progression
    const t1 = setTimeout(() => setPipelineStep(2), 500);
    const t2 = setTimeout(() => setPipelineStep(3), 1000);
    const t3 = setTimeout(() => setPipelineStep(4), 1500);
    const t4 = setTimeout(() => setPipelineStep(5), 2000);

    try {
      const historyToUse = txHistory || SAMPLE_PRESETS.auto_approve.transaction_history;

      const payload = {
        business_name: formData.business_name,
        business_category: formData.business_category,
        gstin: formData.gstin || '27ABCDE1234F1Z5',
        registration_date: formData.registration_date || '2024-01-01',
        business_age_months: Number(formData.business_age_months) || 24,
        loan_amount: Number(formData.loan_amount) || 500000,
        loan_tenure_months: Number(formData.loan_tenure_months) || 12,
        transaction_history: historyToUse,
        bank_details: {
          account_holder: bankData.account_holder,
          account_number: bankData.account_number,
          masked_account_number: maskAccountNumber(bankData.account_number),
          ifsc: bankData.ifsc,
          bank_name: bankData.bank_name,
          branch: bankData.branch || '',
          city: bankData.city || '',
          state: bankData.state || '',
          bank_verification: {
            status: bankVerification.status || 'Verified',
            registeredName: bankVerification.registeredName || bankData.account_holder,
            referenceId: bankVerification.referenceId || `fav_test_${Date.now()}`,
            validatedAt: new Date().toISOString()
          },
          bankVerificationStatus: bankVerification.status || 'Verified'
        },
        documents: {
          gst_certificate: documents.gst_certificate ? {
            name: documents.gst_certificate.name,
            size: documents.gst_certificate.size,
            sizeFormatted: documents.gst_certificate.sizeFormatted,
            type: documents.gst_certificate.type,
            width: documents.gst_certificate.width || 1200,
            height: documents.gst_certificate.height || 800,
            verified: true
          } : null,
          pan_card: documents.pan_card ? {
            name: documents.pan_card.name,
            size: documents.pan_card.size,
            sizeFormatted: documents.pan_card.sizeFormatted,
            type: documents.pan_card.type,
            width: documents.pan_card.width || 1000,
            height: documents.pan_card.height || 630,
            verified: true
          } : null,
          bank_statement: documents.bank_statement ? {
            name: documents.bank_statement.name,
            size: documents.bank_statement.size,
            sizeFormatted: documents.bank_statement.sizeFormatted,
            type: documents.bank_statement.type,
            pageCount: documents.bank_statement.pageCount || 6,
            verified: true
          } : null
        }
      };

      let res;
      if (publicCompany && publicCompany.slug) {
        res = await submitPublicApplication(publicCompany.slug, payload);
      } else {
        res = await submitApplyApplication(payload);
      }
      setResult(res);
    } catch (err) {
      setError(err.message || 'Submission failed.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setSubmitting(false);
    }
  };

  // --- Result Screen Rendering ---
  if (result) {
    const decision = (result.decision || '').toLowerCase();
    const isApproved = decision === 'auto_approve' || decision === 'approved';
    const isRejected = decision === 'auto_reject' || decision === 'rejected';
    const isPending = decision === 'route_to_human' || (!isApproved && !isRejected);

    return (
      <div className="dashboard-container">
        <div className="result-card-wrapper">
          {/* Header Status Banner */}
          {isApproved && (
            <div className="result-banner banner-approved">
              <div className="banner-icon">🎉</div>
              <div>
                <h2 className="banner-title">Application Approved!</h2>
                <p className="banner-desc">Automated AI Underwriting Verification Complete</p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="result-banner banner-rejected">
              <div className="banner-icon">⚠️</div>
              <div>
                <h2 className="banner-title">Application Declined</h2>
                <p className="banner-desc">Automated Credit Risk Threshold Evaluation</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="result-banner banner-review">
              <div className="banner-icon">⏳</div>
              <div>
                <h2 className="banner-title">Application Under Review</h2>
                <p className="banner-desc">Routed to Human Underwriter Queue for Manual Inspection</p>
              </div>
            </div>
          )}

          {/* Details Body */}
          <div className="result-body">
            <div className="result-meta-grid">
              <div className="meta-box">
                <span className="meta-label">Application Reference ID</span>
                <span className="meta-value font-mono">{result.applicationId}</span>
              </div>
              <div className="meta-box">
                <span className="meta-label">Underwriting Decision</span>
                <span className={`meta-value ${isApproved ? 'text-emerald' : isRejected ? 'text-rose' : 'text-amber'}`}>
                  {isApproved ? 'AUTO APPROVED' : isRejected ? 'DECLINED' : 'ROUTE TO HUMAN REVIEW'}
                </span>
              </div>
            </div>

            {/* Applicant Message Box */}
            <div className="applicant-message-box">
              <h4 className="message-box-title">Underwriting Notice & Guidance</h4>
              <p className="message-box-content">{result.applicantMessage || 'Your application has been processed by our underwriting engine.'}</p>
            </div>

            {/* Bank & Settlement Confirmation Notice */}
            {bankData.account_number && (
              <div className="result-summary-section">
                <h4 className="section-sub-title">Verified Settlement Account</h4>
                <div className="verified-settlement-row">
                  <div className="settlement-item">
                    <span className="text-dim">Bank:</span> <strong>{bankData.bank_name || 'Bank'}</strong>
                  </div>
                  <div className="settlement-item">
                    <span className="text-dim">Account:</span> <span className="font-mono">{maskAccountNumber(bankData.account_number)}</span>
                  </div>
                  <div className="settlement-item">
                    <span className="text-dim">IFSC:</span> <span className="font-mono">{bankData.ifsc}</span>
                  </div>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="advice-callout">
                <h5 className="advice-title">💡 How to improve your application for re-submission</h5>
                <ul className="advice-list">
                  <li>Maintain stable weekly transaction volumes with lower revenue volatility.</li>
                  <li>Keep refund rates below category benchmark thresholds.</li>
                  <li>Build a longer operating history (12+ months of consistent settlements).</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="result-actions">
              <Link to="/dashboard" className="btn-secondary">
                ← Back to Dashboard
              </Link>
              <button
                className="btn-primary"
                onClick={() => {
                  setResult(null);
                  setActivePreset(null);
                  setCurrentStep(1);
                  setFormData({
                    business_name: '',
                    business_category: 'electronics',
                    gstin: '',
                    registration_date: '',
                    business_age_months: ''
                  });
                  setBankData({
                    account_holder: '',
                    account_number: '',
                    ifsc: '',
                    bank_name: '',
                    branch: '',
                    city: '',
                    state: '',
                    micr: '',
                    ifsc_verified: false,
                    ifsc_loading: false,
                    ifsc_error: null
                  });
                  setDocuments({
                    gst_certificate: null,
                    pan_card: null,
                    bank_statement: null
                  });
                  setTxHistory(null);
                }}
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <Link to="/dashboard" className="back-link">
            ← Back to Dashboard
          </Link>
          <h1 className="dashboard-title">Merchant Underwriting Application</h1>
          <p className="dashboard-subtitle">
            Provide business metrics, verified bank settlement details, and KYC documents for automated AI assessment.
          </p>
        </div>
      </div>

      {/* Demo Preset Helper Toolbar */}
      <div className="preset-toolbar">
        <div className="preset-toolbar-header">
          <span className="preset-badge">⚡ 1-Click Demo Helper</span>
          <span className="preset-hint">Auto-fill all form steps with realistic business & bank data:</span>
        </div>
        <div className="preset-buttons">
          <button
            type="button"
            className={`preset-btn preset-approved ${activePreset === 'auto_approve' ? 'active' : ''}`}
            onClick={() => handleLoadSample('auto_approve')}
          >
            <span>🟢</span> Auto-Approve Preset
          </button>
          <button
            type="button"
            className={`preset-btn preset-rejected ${activePreset === 'auto_reject' ? 'active' : ''}`}
            onClick={() => handleLoadSample('auto_reject')}
          >
            <span>🔴</span> Auto-Reject Preset
          </button>
          <button
            type="button"
            className={`preset-btn preset-review ${activePreset === 'route_to_human' ? 'active' : ''}`}
            onClick={() => handleLoadSample('route_to_human')}
          >
            <span>🟡</span> Route to Human Preset
          </button>
        </div>
      </div>

      {/* Multi-Step Stepper Header */}
      <div className="wizard-stepper-container">
        <div className="wizard-stepper">
          <div
            className={`wizard-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
            <div className="step-meta">
              <span className="step-num">Step 1</span>
              <span className="step-label">Business Info</span>
            </div>
          </div>

          <div className={`step-connector ${currentStep > 1 ? 'active' : ''}`}></div>

          <div
            className={`wizard-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
            onClick={() => {
              if (validateStep1()) setCurrentStep(2);
            }}
          >
            <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
            <div className="step-meta">
              <span className="step-num">Step 2</span>
              <span className="step-label">Bank Details</span>
            </div>
          </div>

          <div className={`step-connector ${currentStep > 2 ? 'active' : ''}`}></div>

          <div
            className={`wizard-step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3);
            }}
          >
            <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
            <div className="step-meta">
              <span className="step-num">Step 3</span>
              <span className="step-label">Document Upload</span>
            </div>
          </div>

          <div className={`step-connector ${currentStep > 3 ? 'active' : ''}`}></div>

          <div
            className={`wizard-step-item ${currentStep === 4 ? 'active' : ''}`}
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(4);
            }}
          >
            <div className="step-circle">4</div>
            <div className="step-meta">
              <span className="step-num">Step 4</span>
              <span className="step-label">Review & Submit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Application Form Wizard */}
      <div className="dashboard-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

        {/* STEP 1: Business Profile */}
        {currentStep === 1 && (
          <div className="step-panel">
            <div className="step-header">
              <h2 className="step-title">🏢 Business & Operational Profile</h2>
              <p className="step-subtitle">Enter legal company registration details and operating metrics.</p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="business_name">Business Legal Name *</label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  required
                  placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                  value={formData.business_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="business_category">Business Category *</label>
                <select
                  id="business_category"
                  name="business_category"
                  value={formData.business_category}
                  onChange={handleInputChange}
                  className="auth-select"
                >
                  <option value="electronics">Electronics & Gadgets</option>
                  <option value="apparel">Apparel & Fashion</option>
                  <option value="food">Food & Dining</option>
                  <option value="services">Services & Logistics</option>
                  <option value="grocery">Grocery & Supermart</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="gstin">GSTIN (15 Alphanumeric)</label>
                <input
                  id="gstin"
                  name="gstin"
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={formData.gstin}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registration_date">Registration Date</label>
                <input
                  id="registration_date"
                  name="registration_date"
                  type="date"
                  value={formData.registration_date}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="business_age_months">Operating Age (Months)</label>
                <input
                  id="business_age_months"
                  name="business_age_months"
                  type="number"
                  min="1"
                  max="360"
                  placeholder="e.g. 24"
                  value={formData.business_age_months}
                  onChange={handleInputChange}
                />
              </div>

              {/* Loan Facility Request Fields */}
              <div className="form-group">
                <label htmlFor="loan_amount">Loan Amount Required (₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: '700' }}>₹</span>
                  <input
                    id="loan_amount"
                    name="loan_amount"
                    type="number"
                    min="10000"
                    max="100000000"
                    step="10000"
                    required
                    placeholder="e.g. 500000"
                    style={{ paddingLeft: '2.1rem' }}
                    value={formData.loan_amount}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="loan_tenure_months">Preferred Tenure *</label>
                <select
                  id="loan_tenure_months"
                  name="loan_tenure_months"
                  value={formData.loan_tenure_months}
                  onChange={handleInputChange}
                  className="auth-select"
                >
                  <option value="6">6 Months (Half Year)</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="18">18 Months (1.5 Years)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                </select>
              </div>
            </div>

            {/* Live EMI Calculator Widget */}
            {(() => {
              const emiCalc = calculateEmi(formData.loan_amount, formData.loan_tenure_months, 14);
              return (
                <div className="emi-calculator-card">
                  <div className="emi-calc-header">
                    <h3 className="emi-calc-title">
                      <span>🧮</span> Live EMI & Repayment Estimator
                    </h3>
                    <span className="emi-rate-badge">Interest: 14% p.a.</span>
                  </div>

                  <div className="emi-metrics-row">
                    <div className="emi-metric-box primary-emi">
                      <span className="emi-metric-label">Estimated Monthly EMI</span>
                      <span className="emi-metric-val text-emerald">
                        ₹{emiCalc.emi.toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-dim)' }}>/ month</span>
                      </span>
                      <span className="emi-metric-sub">{formData.loan_tenure_months || 12} monthly installments</span>
                    </div>

                    <div className="emi-metric-box">
                      <span className="emi-metric-label">Total Repayment Amount</span>
                      <span className="emi-metric-val">
                        ₹{emiCalc.totalPayable.toLocaleString('en-IN')}
                      </span>
                      <span className="emi-metric-sub">Principal + Total Interest</span>
                    </div>

                    <div className="emi-metric-box">
                      <span className="emi-metric-label">Total Estimated Interest</span>
                      <span className="emi-metric-val" style={{ color: 'var(--accent-blue)' }}>
                        ₹{emiCalc.totalInterest.toLocaleString('en-IN')}
                      </span>
                      <span className="emi-metric-sub">@ 14% reducing per annum</span>
                    </div>
                  </div>

                  <p className="emi-disclaimer">
                    <span>ℹ️</span>
                    <span>Estimated at 14% p.a. — actual rate and terms may vary based on final underwriter credit approval.</span>
                  </p>
                </div>
              );
            })()}

            {/* Transaction Data Attachment Status */}
            <div className="tx-status-box" style={{ marginTop: '1.25rem' }}>
              <div className="tx-status-header">
                <span className="tx-status-title">Attached Historical Transaction Dataset</span>
                {txHistory ? (
                  <span className="tx-status-loaded">✓ {txHistory.length} Datapoints Linked</span>
                ) : (
                  <span className="tx-status-default">ℹ️ Default baseline transaction ledger active</span>
                )}
              </div>
              <p className="tx-status-desc">
                Transaction history contains weekly GMV, payment splits (UPI/Cards/Netbanking), refund rates, and settlement cycles used by AI risk agents.
              </p>
            </div>

            <div className="wizard-actions">
              <div></div>
              <button type="button" className="btn-primary" onClick={goToNextStep}>
                Continue to Bank Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Bank Details Section */}
        {currentStep === 2 && (
          <div className="step-panel">
            <div className="step-header">
              <h2 className="step-title">🏦 Bank & Settlement Details</h2>
              <p className="step-subtitle">
                Provide commercial settlement account information. Bank name and branch are automatically verified via Razorpay IFSC lookup.
              </p>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="account_holder">Account Holder Legal Name *</label>
                <input
                  id="account_holder"
                  name="account_holder"
                  type="text"
                  placeholder="e.g. Apex Tech Solutions Pvt Ltd"
                  value={bankData.account_holder}
                  onChange={handleAccountHolderChange}
                  className={bankValidationErrors.account_holder ? 'input-error' : ''}
                />
                {bankValidationErrors.account_holder && (
                  <span className="field-error-msg">{bankValidationErrors.account_holder}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="account_number">Bank Account Number * (Numeric Only)</label>
                <input
                  id="account_number"
                  name="account_number"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50200084729103"
                  value={bankData.account_number}
                  onChange={handleAccountNumberChange}
                  className={bankValidationErrors.account_number ? 'input-error' : ''}
                />
                {bankValidationErrors.account_number ? (
                  <span className="field-error-msg">{bankValidationErrors.account_number}</span>
                ) : (
                  <span className="field-hint">Numbers only (9-18 digits). Masked in review summaries.</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="ifsc">
                  IFSC Code *{' '}
                  <span className="label-sub">(Auto-lookup)</span>
                </label>
                <div className="input-with-loader">
                  <input
                    id="ifsc"
                    name="ifsc"
                    type="text"
                    maxLength={11}
                    placeholder="e.g. HDFC0000060"
                    value={bankData.ifsc}
                    onChange={handleIfscChange}
                    className={`font-mono uppercase-input ${bankValidationErrors.ifsc || bankData.ifsc_error ? 'input-error' : ''}`}
                  />
                  {bankData.ifsc_loading && <span className="inline-spinner"></span>}
                </div>
                {bankData.ifsc_error ? (
                  <span className="field-error-msg">{bankData.ifsc_error}</span>
                ) : bankValidationErrors.ifsc ? (
                  <span className="field-error-msg">{bankValidationErrors.ifsc}</span>
                ) : (
                  <span className="field-hint">Format: 4 letters + 0 + 6 alphanumeric (e.g. HDFC0000060)</span>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="bank_name">Bank Name *</label>
                <input
                  id="bank_name"
                  name="bank_name"
                  type="text"
                  placeholder="Auto-filled from IFSC lookup"
                  value={bankData.bank_name}
                  onChange={handleBankNameChange}
                  className={bankValidationErrors.bank_name ? 'input-error' : ''}
                />
                {bankValidationErrors.bank_name && (
                  <span className="field-error-msg">{bankValidationErrors.bank_name}</span>
                )}
              </div>
            </div>

            {/* Verified IFSC Callout Badge */}
            {bankData.ifsc_verified && bankData.bank_name && (
              <div className="ifsc-lookup-card">
                <div className="ifsc-lookup-header">
                  <div className="ifsc-badge-tag">
                    <span className="text-emerald font-bold">✓ IFSC Verified</span>
                  </div>
                  <span className="ifsc-api-source font-mono">Razorpay IFSC Lookup</span>
                </div>
                <div className="ifsc-lookup-details">
                  <div className="ifsc-detail-col">
                    <span className="ifsc-detail-label">Bank Name</span>
                    <span className="ifsc-detail-val">{bankData.bank_name}</span>
                  </div>
                  <div className="ifsc-detail-col">
                    <span className="ifsc-detail-label">Branch</span>
                    <span className="ifsc-detail-val">{bankData.branch || 'Main Branch'}</span>
                  </div>
                  <div className="ifsc-detail-col">
                    <span className="ifsc-detail-label">Location</span>
                    <span className="ifsc-detail-val">{[bankData.city, bankData.state].filter(Boolean).join(', ') || 'India'}</span>
                  </div>
                  <div className="ifsc-detail-col">
                    <span className="ifsc-detail-label">IFSC Code</span>
                    <span className="ifsc-detail-val font-mono">{bankData.ifsc}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Razorpay Fund Account Validation (Penny-Drop) Section */}
            <div
              className="bank-verification-section"
              style={{
                marginTop: '1.5rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      Commercial Bank Account Verification (Penny-Drop)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Validates account activity and legal beneficiary name matching via Razorpay FAV API.
                    </div>
                  </div>
                </div>
                <span className="badge badge-review" style={{ fontSize: '0.7rem' }}>
                  🧪 Razorpay Sandbox Mode
                </span>
              </div>

              {/* Status Display */}
              {bankVerification.status === 'Verified' && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#10b981', fontWeight: '800', fontSize: '1rem' }}>✓ Bank account verified</span>
                    <span className="badge badge-approved" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    Beneficiary Name: <strong>{bankVerification.registeredName || bankData.account_holder}</strong>
                  </div>
                  {bankVerification.referenceId && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                      Razorpay Ref ID: {bankVerification.referenceId}
                    </div>
                  )}
                </div>
              )}

              {bankVerification.status === 'Failed' && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '0.95rem' }}>
                      ⚠️ We couldn't verify this account — please double-check your details
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                    {bankVerification.message || 'Bank returned inactive or invalid account number. Please check the digits and try again.'}
                  </p>
                </div>
              )}

              {bankVerification.status === 'Name Mismatch' && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#f59e0b', fontWeight: '800', fontSize: '0.95rem' }}>
                      ⚠️ Account Holder Name Mismatch
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0, lineHeight: '1.4' }}>
                    {bankVerification.message || `Bank registered name differs from entered name. Application will require underwriter review.`}
                  </p>
                </div>
              )}

              {/* Action Buttons & Sandbox Testing Presets */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={bankVerification.status === 'Verified' ? 'btn-secondary' : 'btn-primary'}
                  onClick={triggerBankVerification}
                  disabled={bankVerification.loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.55rem 1rem' }}
                >
                  {bankVerification.loading ? (
                    <>
                      <span className="inline-spinner"></span>
                      <span>Verifying via Penny-Drop...</span>
                    </>
                  ) : (
                    <>
                      <span>{bankVerification.status === 'Verified' ? '✓ Re-verify Bank Account' : '⚡ Verify Bank Account'}</span>
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Sandbox Quick-Fills:</span>
                  <button
                    type="button"
                    className="preset-pill-btn"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => {
                      setBankData(prev => ({ ...prev, account_number: '50200084729103' }));
                      setBankVerification(prev => ({ ...prev, status: 'Not Attempted' }));
                    }}
                  >
                    Active Account
                  </button>
                  <button
                    type="button"
                    className="preset-pill-btn"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => {
                      setBankData(prev => ({ ...prev, account_number: '999999999999' }));
                      setBankVerification(prev => ({ ...prev, status: 'Not Attempted' }));
                    }}
                  >
                    Invalid Account
                  </button>
                  <button
                    type="button"
                    className="preset-pill-btn"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => {
                      setBankData(prev => ({ ...prev, account_number: '888888888888' }));
                      setBankVerification(prev => ({ ...prev, status: 'Not Attempted' }));
                    }}
                  >
                    Name Mismatch
                  </button>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button type="button" className="btn-secondary" onClick={goToPrevStep}>
                ← Back to Business Info
              </button>
              <button type="button" className="btn-primary" onClick={goToNextStep}>
                Continue to Document Upload →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Document Upload Section */}
        {currentStep === 3 && (
          <div className="step-panel">
            <div className="step-header">
              <h2 className="step-title">📁 Document Verification Upload</h2>
              <p className="step-subtitle">
                Upload business registration, tax identity, and financial statements (PDF, JPG, PNG up to 5MB).
              </p>
            </div>

            <div className="documents-upload-grid">
              {/* Document 1: GST Certificate */}
              <div className="doc-upload-card">
                <div className="doc-card-header">
                  <div className="doc-type-icon">📜</div>
                  <div>
                    <h3 className="doc-title">GST Registration Certificate</h3>
                    <p className="doc-specs">Accepts .pdf, .jpg, .png (Max 5MB)</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={gstInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileSelect('gst_certificate', e.target.files[0], ['.pdf', '.jpg', '.jpeg', '.png'], 5)}
                />

                {documents.gst_certificate ? (
                  <div className="file-preview-box">
                    <div className="file-preview-info">
                      <div className="file-icon-badge">
                        {documents.gst_certificate.type?.includes('image') ? '🖼️' : '📄'}
                      </div>
                      <div className="file-info-text">
                        <span className="file-name" title={documents.gst_certificate.name}>
                          {documents.gst_certificate.name}
                        </span>
                        <span className="file-size">{documents.gst_certificate.sizeFormatted}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Success indicator */}
                    <div className="upload-progress-wrapper">
                      <div className="upload-progress-bar">
                        <div
                          className="upload-progress-fill"
                          style={{ width: `${documents.gst_certificate.progress}%` }}
                        ></div>
                      </div>
                      <div className="upload-status-row">
                        {documents.gst_certificate.isUploaded ? (
                          <span className="upload-badge-success">✓ Uploaded & Ready</span>
                        ) : (
                          <span className="upload-badge-loading">Uploading {documents.gst_certificate.progress}%...</span>
                        )}
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleRemoveDocument('gst_certificate')}
                          title="Remove file"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="upload-dropzone"
                    onClick={() => gstInputRef.current && gstInputRef.current.click()}
                  >
                    <div className="dropzone-icon">☁️</div>
                    <p className="dropzone-text">Click to browse or drop GST certificate here</p>
                    <span className="dropzone-hint">PDF, JPG, or PNG up to 5MB</span>
                  </div>
                )}

                {documentErrors.gst_certificate && (
                  <div className="doc-error-alert">{documentErrors.gst_certificate}</div>
                )}
              </div>

              {/* Document 2: PAN Card */}
              <div className="doc-upload-card">
                <div className="doc-card-header">
                  <div className="doc-type-icon">🪪</div>
                  <div>
                    <h3 className="doc-title">Company / Signatory PAN Card</h3>
                    <p className="doc-specs">Accepts .pdf, .jpg, .png (Max 5MB)</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={panInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileSelect('pan_card', e.target.files[0], ['.pdf', '.jpg', '.jpeg', '.png'], 5)}
                />

                {documents.pan_card ? (
                  <div className="file-preview-box">
                    <div className="file-preview-info">
                      <div className="file-icon-badge">
                        {documents.pan_card.type?.includes('image') ? '🖼️' : '📄'}
                      </div>
                      <div className="file-info-text">
                        <span className="file-name" title={documents.pan_card.name}>
                          {documents.pan_card.name}
                        </span>
                        <span className="file-size">{documents.pan_card.sizeFormatted}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Success indicator */}
                    <div className="upload-progress-wrapper">
                      <div className="upload-progress-bar">
                        <div
                          className="upload-progress-fill"
                          style={{ width: `${documents.pan_card.progress}%` }}
                        ></div>
                      </div>
                      <div className="upload-status-row">
                        {documents.pan_card.isUploaded ? (
                          <span className="upload-badge-success">✓ Uploaded & Ready</span>
                        ) : (
                          <span className="upload-badge-loading">Uploading {documents.pan_card.progress}%...</span>
                        )}
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleRemoveDocument('pan_card')}
                          title="Remove file"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="upload-dropzone"
                    onClick={() => panInputRef.current && panInputRef.current.click()}
                  >
                    <div className="dropzone-icon">☁️</div>
                    <p className="dropzone-text">Click to browse or drop PAN card here</p>
                    <span className="dropzone-hint">PDF, JPG, or PNG up to 5MB</span>
                  </div>
                )}

                {documentErrors.pan_card && (
                  <div className="doc-error-alert">{documentErrors.pan_card}</div>
                )}
              </div>

              {/* Document 3: Bank Statement */}
              <div className="doc-upload-card">
                <div className="doc-card-header">
                  <div className="doc-type-icon">📊</div>
                  <div>
                    <h3 className="doc-title">Bank Statement (Last 6 Months)</h3>
                    <p className="doc-specs">Accepts .pdf (Max 5MB)</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={bankStmtInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf"
                  onChange={(e) => handleFileSelect('bank_statement', e.target.files[0], ['.pdf'], 5)}
                />

                {documents.bank_statement ? (
                  <div className="file-preview-box">
                    <div className="file-preview-info">
                      <div className="file-icon-badge">📄</div>
                      <div className="file-info-text">
                        <span className="file-name" title={documents.bank_statement.name}>
                          {documents.bank_statement.name}
                        </span>
                        <span className="file-size">{documents.bank_statement.sizeFormatted}</span>
                      </div>
                    </div>

                    {/* Progress Bar & Success indicator */}
                    <div className="upload-progress-wrapper">
                      <div className="upload-progress-bar">
                        <div
                          className="upload-progress-fill"
                          style={{ width: `${documents.bank_statement.progress}%` }}
                        ></div>
                      </div>
                      <div className="upload-status-row">
                        {documents.bank_statement.isUploaded ? (
                          <span className="upload-badge-success">✓ Uploaded & Ready</span>
                        ) : (
                          <span className="upload-badge-loading">Uploading {documents.bank_statement.progress}%...</span>
                        )}
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleRemoveDocument('bank_statement')}
                          title="Remove file"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="upload-dropzone"
                    onClick={() => bankStmtInputRef.current && bankStmtInputRef.current.click()}
                  >
                    <div className="dropzone-icon">☁️</div>
                    <p className="dropzone-text">Click to browse or drop Bank Statement here</p>
                    <span className="dropzone-hint">PDF only up to 5MB</span>
                  </div>
                )}

                {documentErrors.bank_statement && (
                  <div className="doc-error-alert">{documentErrors.bank_statement}</div>
                )}
              </div>
            </div>

            <div className="wizard-actions">
              <button type="button" className="btn-secondary" onClick={goToPrevStep}>
                ← Back to Bank Details
              </button>
              <button type="button" className="btn-primary" onClick={goToNextStep}>
                Proceed to Review & Summary →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Summary Step */}
        {currentStep === 4 && (
          <div className="step-panel">
            <div className="step-header">
              <h2 className="step-title">📋 Review & Final Confirmation</h2>
              <p className="step-subtitle">
                Please verify your business profile, bank settlement details, and uploaded verification documents before executing AI Underwriting.
              </p>
            </div>

            {/* Summary Section 1: Business Profile & Loan Request */}
            <div className="review-section-card">
              <div className="review-section-header">
                <div className="review-section-title">
                  <span>🏢</span> Business Information & Credit Line Request
                </div>
                <button type="button" className="btn-review-edit" onClick={() => setCurrentStep(1)}>
                  Edit
                </button>
              </div>
              <div className="review-grid">
                <div className="review-item">
                  <span className="review-item-label">Legal Name</span>
                  <span className="review-item-value font-semibold">{formData.business_name || 'N/A'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Category</span>
                  <span className="review-item-value capitalize">{formData.business_category || 'Electronics'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">GSTIN</span>
                  <span className="review-item-value font-mono">{formData.gstin || '27ABCDE1234F1Z5'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Operating Age</span>
                  <span className="review-item-value">{formData.business_age_months ? `${formData.business_age_months} Months` : '24 Months'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Requested Loan Amount</span>
                  <span className="review-item-value font-bold text-emerald" style={{ fontSize: '1rem' }}>
                    ₹{Number(formData.loan_amount || 500000).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Preferred Tenure</span>
                  <span className="review-item-value font-semibold">
                    {formData.loan_tenure_months || 12} Months
                  </span>
                </div>
                {(() => {
                  const emi = calculateEmi(formData.loan_amount, formData.loan_tenure_months, 14);
                  return (
                    <div className="review-item" style={{ gridColumn: 'span 2' }}>
                      <span className="review-item-label">Estimated Monthly EMI (@ 14% p.a.)</span>
                      <span className="review-item-value font-bold text-cyan">
                        ₹{emi.emi.toLocaleString('en-IN')} / mo (Total Repayable: ₹{emi.totalPayable.toLocaleString('en-IN')})
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Summary Section 2: Bank Settlement Details */}
            <div className="review-section-card">
              <div className="review-section-header">
                <div className="review-section-title">
                  <span>🏦</span> Bank & Settlement Details
                </div>
                <button type="button" className="btn-review-edit" onClick={() => setCurrentStep(2)}>
                  Edit
                </button>
              </div>
              <div className="review-grid">
                <div className="review-item">
                  <span className="review-item-label">Account Holder</span>
                  <span className="review-item-value font-semibold">{bankData.account_holder || formData.business_name || 'N/A'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Account Number (Masked)</span>
                  <span className="review-item-value font-mono text-cyan">
                    {maskAccountNumber(bankData.account_number)}
                  </span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">IFSC Code</span>
                  <span className="review-item-value font-mono">{bankData.ifsc || 'HDFC0000060'}</span>
                </div>
                <div className="review-item">
                  <span className="review-item-label">Bank & Branch</span>
                  <span className="review-item-value">
                    {bankData.bank_name ? `${bankData.bank_name}${bankData.branch ? ` (${bankData.branch})` : ''}` : 'Verified Commercial Bank'}
                  </span>
                </div>
              </div>
              <div className="review-badge-row" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {bankData.ifsc_verified && (
                  <span className="badge badge-approved">
                    <span className="badge-dot dot-approved"></span> IFSC Verified
                  </span>
                )}
                {bankVerification.status === 'Verified' && (
                  <span className="badge badge-approved" style={{ background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                    ✓ Bank Account Active (Razorpay Penny-Drop Verified)
                  </span>
                )}
                {bankVerification.status === 'Failed' && (
                  <span className="badge badge-rejected">
                    ⚠️ Penny-Drop Verification Failed
                  </span>
                )}
                {bankVerification.status === 'Name Mismatch' && (
                  <span className="badge badge-review">
                    ⚠️ Account Name Mismatch
                  </span>
                )}
              </div>
            </div>

            {/* Summary Section 3: Uploaded Documents Checklist */}
            <div className="review-section-card">
              <div className="review-section-header">
                <div className="review-section-title">
                  <span>📁</span> Uploaded Verification Documents
                </div>
                <button type="button" className="btn-review-edit" onClick={() => setCurrentStep(3)}>
                  Edit
                </button>
              </div>

              <div className="doc-checklist">
                {/* GST Certificate */}
                <div className="checklist-item">
                  <div className="checklist-status-icon">
                    {documents.gst_certificate ? (
                      <span className="check-success">✓</span>
                    ) : (
                      <span className="check-optional">○</span>
                    )}
                  </div>
                  <div className="checklist-info">
                    <div className="checklist-doc-title">
                      GST Registration Certificate
                      {documents.gst_certificate && <span className="doc-verified-pill">Verified</span>}
                    </div>
                    <div className="checklist-doc-sub">
                      {documents.gst_certificate
                        ? `${documents.gst_certificate.name} (${documents.gst_certificate.sizeFormatted})`
                        : 'No document attached (Optional for preview)'}
                    </div>
                  </div>
                </div>

                {/* PAN Card */}
                <div className="checklist-item">
                  <div className="checklist-status-icon">
                    {documents.pan_card ? (
                      <span className="check-success">✓</span>
                    ) : (
                      <span className="check-optional">○</span>
                    )}
                  </div>
                  <div className="checklist-info">
                    <div className="checklist-doc-title">
                      Company / Signatory PAN Card
                      {documents.pan_card && <span className="doc-verified-pill">Verified</span>}
                    </div>
                    <div className="checklist-doc-sub">
                      {documents.pan_card
                        ? `${documents.pan_card.name} (${documents.pan_card.sizeFormatted})`
                        : 'No document attached (Optional for preview)'}
                    </div>
                  </div>
                </div>

                {/* Bank Statement */}
                <div className="checklist-item">
                  <div className="checklist-status-icon">
                    {documents.bank_statement ? (
                      <span className="check-success">✓</span>
                    ) : (
                      <span className="check-optional">○</span>
                    )}
                  </div>
                  <div className="checklist-info">
                    <div className="checklist-doc-title">
                      Bank Statement (Last 6 Months)
                      {documents.bank_statement && <span className="doc-verified-pill">Verified</span>}
                    </div>
                    <div className="checklist-doc-sub">
                      {documents.bank_statement
                        ? `${documents.bank_statement.name} (${documents.bank_statement.sizeFormatted})`
                        : 'No document attached (Optional for preview)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Controls & Loading Progress */}
            {submitting ? (
              <div className="pipeline-loading-box">
                <div className="spinner"></div>
                <h4 className="loading-title">Executing Multi-Agent Underwriting Engine...</h4>
                <p className="loading-sub">
                  DataAgent → DocumentVerificationAgent → RiskAgent → AdversarialAgent → DecisionRouter → ExplainerAgent
                </p>
                <div className="pipeline-progress-steps">
                  <span className={`step-dot ${pipelineStep >= 1 ? 'active' : ''}`}>1. Data Ingestion</span>
                  <span className={`step-dot ${pipelineStep >= 2 ? 'active' : ''}`}>2. Document Verification</span>
                  <span className={`step-dot ${pipelineStep >= 3 ? 'active' : ''}`}>3. Risk Calculation</span>
                  <span className={`step-dot ${pipelineStep >= 4 ? 'active' : ''}`}>4. Adversarial Stress Test</span>
                  <span className={`step-dot ${pipelineStep >= 5 ? 'active' : ''}`}>5. Decision & Explanation</span>
                </div>
              </div>
            ) : (
              <div className="wizard-actions">
                <button type="button" className="btn-secondary" onClick={goToPrevStep}>
                  ← Back to Documents
                </button>
                <button type="button" className="submit-btn-primary" onClick={handleSubmit}>
                  Execute AI Underwriting Pipeline →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
