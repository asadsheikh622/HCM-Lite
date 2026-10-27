import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { apiRouter } from '../server/src/routes/api.routes';
import { connectDB, dbStatus } from '../server/src/config/database';
import { ENV } from '../server/src/config/env';

const app = express();

// Permissive CORS for Vercel preview & production deployments
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-CSRF-Token',
      'X-Api-Version',
    ],
  })
);

// Explicit preflight handler to eliminate any 405 Method Not Allowed issues on OPTIONS
app.options('*', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware: ensure MongoDB connection pool is active for every serverless invocation
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
  } catch (err: any) {
    console.error('[Vercel Serverless] DB connection notice:', err.message);
  }
  next();
});

// Mount the API Router across all common routing variations:
// 1. /api/v1 prefix (standard client fetch)
app.use('/api/v1', apiRouter);

// 2. /v1 prefix (in case rewrite stripped /api)
app.use('/v1', apiRouter);

// 3. /api prefix (for /api/health and direct /api calls)
app.use('/api', apiRouter);

// 4. Root fallback router for any fully rewritten paths
app.use('/', apiRouter);

// JSON 404 handler for unmatched API routes
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'API endpoint not found',
    message: 'The requested API route does not exist. Check endpoint URL.',
  });
});

// Export default handler for Vercel Serverless Functions
export default async function handler(req: Request, res: Response) {
  try {
    await connectDB();
  } catch (err: any) {
    console.error('[Vercel Serverless] Request connection error:', err.message);
  }
  return app(req, res);
}
