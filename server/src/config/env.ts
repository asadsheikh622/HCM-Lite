 import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const ENV = {
  NODE_ENV: (process.env.NODE_ENV || 'development').trim(),
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  JWT_SECRET: (process.env.JWT_SECRET || 'hcm_lite_jwt_super_secret_key_2026_hackathon_secure').trim(),
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim(),
  INITIAL_ADMIN_EMAIL: (process.env.INITIAL_ADMIN_EMAIL || 'asadqadri239@gmail.com').toLowerCase().trim(),
};

export const isProduction = ENV.NODE_ENV === 'production';

export function validateEnv() {
  const missing: string[] = [];
  if (!ENV.JWT_SECRET) missing.push('JWT_SECRET');
  if (isProduction && !ENV.MONGODB_URI) missing.push('MONGODB_URI');

  return {
    isValid: missing.length === 0,
    isProduction,
    hasMongoUri: Boolean(ENV.MONGODB_URI),
    hasGeminiKey: Boolean(ENV.GEMINI_API_KEY),
    missing,
  };
}
