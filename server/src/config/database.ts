import mongoose from 'mongoose';
import { ENV } from './env';

export interface IDBStatus {
  isConnected: boolean;
  mode: 'atlas' | 'memory';
  isFallback: boolean;
  statusText: string;
  host?: string;
  name?: string;
  error?: string;
  lastConnectedAt?: string;
  poolSize?: {
    min: number;
    max: number;
  };
}

export const dbStatus: IDBStatus = {
  isConnected: false,
  mode: 'memory',
  isFallback: true,
  statusText: 'Initializing Database Connection...',
  name: 'hcm_lite',
  poolSize: { min: 2, max: 20 },
};

let connectionPromise: Promise<void> | null = null;

export async function connectDB(): Promise<void> {
  // Prevent duplicate connection attempts across concurrent callers
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const uri = ENV.MONGODB_URI;
    const isProd = ENV.NODE_ENV === 'production';

    if (!uri) {
      if (isProd) {
        console.error('[DB] CRITICAL: No MONGODB_URI configured in production environment.');
        dbStatus.isConnected = false;
        dbStatus.mode = 'atlas';
        dbStatus.isFallback = false;
        dbStatus.statusText = 'MongoDB Atlas URI Missing (Production Halt)';
        dbStatus.error = 'MONGODB_URI must be set in production.';
        return;
      }

      console.log('[DB] No MONGODB_URI provided in environment. Running in development in-memory fallback mode.');
      dbStatus.mode = 'memory';
      dbStatus.isFallback = true;
      dbStatus.isConnected = true;
      dbStatus.name = 'hcm_lite_dev_memory';
      return;
    }

    try {
      console.log('[DB] Connecting to MongoDB Atlas with connection pool...');
      
      // Configure single reusable connection pool with sensible timeouts
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        maxPoolSize: 20,
        minPoolSize: 2,
        dbName: 'hcm_lite',
      });

      dbStatus.isConnected = true;
      dbStatus.mode = 'atlas';
      dbStatus.isFallback = false;
      dbStatus.statusText = 'Connected to MongoDB Atlas (Production Pool Active)';
      dbStatus.host = mongoose.connection.host;
      dbStatus.name = mongoose.connection.name || 'hcm_lite';
      dbStatus.lastConnectedAt = new Date().toISOString();
      dbStatus.error = undefined;
      console.log(`[DB] Successfully connected to MongoDB Atlas cluster (${dbStatus.host}/${dbStatus.name})`);

      mongoose.connection.on('error', (err) => {
        console.error('[DB] MongoDB runtime error:', err);
        dbStatus.isConnected = false;
        dbStatus.error = err.message;
        dbStatus.statusText = `MongoDB Atlas Runtime Error: ${err.message}`;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[DB] MongoDB connection lost.');
        dbStatus.isConnected = false;
        dbStatus.statusText = 'Disconnected from MongoDB Atlas';
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[DB] Reconnected to MongoDB Atlas.');
        dbStatus.isConnected = true;
        dbStatus.statusText = 'Connected to MongoDB Atlas';
        dbStatus.error = undefined;
      });
    } catch (err: any) {
      if (isProd) {
        console.error(`[DB] Production MongoDB Atlas connection failed: ${err.message}`);
        dbStatus.isConnected = false;
        dbStatus.mode = 'atlas';
        dbStatus.isFallback = false;
        dbStatus.statusText = 'MongoDB Atlas Connection Failed (Production)';
        dbStatus.error = `Could not connect to MongoDB Atlas: ${err.message}. Check network access and IP whitelist.`;
      } else {
        console.warn(`[DB] Development Atlas connection failed (${err.message}). Activating development fallback mode.`);
        dbStatus.isConnected = true;
        dbStatus.mode = 'memory';
        dbStatus.isFallback = true;
        dbStatus.statusText = 'Development Fallback Mode (In-Memory Repository)';
        dbStatus.error = `Atlas connection attempt failed: ${err.message}.`;
        dbStatus.name = 'hcm_lite_dev_memory';
      }
    }
  })();

  return connectionPromise;
}
