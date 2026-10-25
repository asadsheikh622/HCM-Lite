import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV, validateEnv } from './server/src/config/env';
import { connectDB } from './server/src/config/database';
import { apiRouter } from './server/src/routes/api.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const envValidation = validateEnv();
  console.log('[HCM Lite] Environment validation:', envValidation);

  // Initialize Database connection
  await connectDB();

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // REST API under /api/v1
  app.use('/api/v1', apiRouter);

  // Health probe root alias
  app.get('/api/health', (_req, res) => {
    res.redirect('/api/v1/health');
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In dev: Mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[HCM Lite] Mounted Vite dev middleware.');
  } else {
    // In prod: Serve built static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = ENV.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HCM Lite] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[HCM Lite] Fatal startup failure:', err);
  process.exit(1);
});
