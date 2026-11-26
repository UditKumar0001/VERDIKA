import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEDGER_PATH = path.resolve(__dirname, '../../data/superadmin_hashed_documents.csv');

/**
 * Irreversible one-way SHA-256 hash so neither admins nor superadmins can read raw document details.
 */
export function sha256Hash(value) {
  if (!value) return '';
  return crypto.createHash('sha256').update(String(value).trim()).digest('hex');
}

/**
 * Appends a hashed-only document audit row to the Super Admin Excel/CSV ledger.
 */
export function recordHashedDocumentEntry({
  applicationId,
  companyId,
  gstin,
  pan,
  bankAccount,
  documentBuffer
}) {
  const dir = path.dirname(LEDGER_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(LEDGER_PATH)) {
    fs.writeFileSync(
      LEDGER_PATH,
      'timestamp,application_id,company_id,gstin_sha256,pan_sha256,bank_sha256,document_sha256\n',
      'utf8'
    );
  }

  const row = [
    new Date().toISOString(),
    applicationId || '',
    companyId || '',
    sha256Hash(gstin),
    sha256Hash(pan),
    sha256Hash(bankAccount),
    documentBuffer ? crypto.createHash('sha256').update(documentBuffer).digest('hex') : ''
  ].join(',');

  fs.appendFileSync(LEDGER_PATH, row + '\n', 'utf8');
  return LEDGER_PATH;
}

export function getHashedLedgerPath() {
  return LEDGER_PATH;
}
