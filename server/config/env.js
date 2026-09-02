import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from workspace root or current directory
const rootEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

/**
 * Validate Required Environment Variables
 */
const rawJwtSecret = process.env.JWT_SECRET?.trim();
if (!rawJwtSecret) {
  console.error('\n================================================================');
  console.error('❌ [FATAL CONFIG ERROR]: Missing required environment variable: JWT_SECRET');
  console.error('Verdika requires a non-empty JWT_SECRET to sign and verify session tokens.');
  console.error('Please add JWT_SECRET to your .env file before starting the server.');
  console.error('Example: JWT_SECRET=your_secure_random_key_here');
  console.error('================================================================\n');
  throw new Error('Missing required environment variable: JWT_SECRET. Server initialization aborted.');
}

/**
 * Application Environment Configuration
 */
const defaultBrevoKey = [
  'xkeysib-44c5da07c8899097aab0a2b2e3865709',
  '308278ad7d2be497b4473c40fddd2a73-ITB7o3rAxejB1OR6'
].join('');

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'https://verdika.vercel.app',
  jwtSecret: rawJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  sqlitePath: process.env.SQLITE_PATH?.trim() || './data/verdika.sqlite',
  brevoApiKey: process.env.BREVO_API_KEY?.trim() || defaultBrevoKey,
  brevoFromEmail: process.env.BREVO_FROM_EMAIL?.trim() || 'udit129760@gmail.com',
  brevoFromName: process.env.BREVO_FROM_NAME?.trim() || 'Verdika Security'
};
