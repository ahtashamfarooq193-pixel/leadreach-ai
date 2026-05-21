import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || 'database.sqlite',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-outreach-saas',
  jwtSecret: process.env.JWT_SECRET || 'saas_outreach_secret_key_12345',
};
