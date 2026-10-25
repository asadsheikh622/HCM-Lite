import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'hcm_lite_jwt_super_secret_key_2026_hackathon_secure',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  INITIAL_ADMIN_EMAIL: (process.env.INITIAL_ADMIN_EMAIL || 'asadqadri239@gmail.com').toLowerCase().trim(),
};

export function validateEnv() {
  const missing: string[] = [];
  if (!ENV.JWT_SECRET) missing.push('JWT_SECRET');
  return {
    isValid: true,
    hasMongoUri: Boolean(ENV.MONGODB_URI),
    hasGeminiKey: Boolean(ENV.GEMINI_API_KEY),
    missing,
  };
}
