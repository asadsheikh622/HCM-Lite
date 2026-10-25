import express from 'express';
import { connectDB } from '../server/src/config/database';
import { apiRouter } from '../server/src/routes/api.routes';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', apiRouter);
let dbReady: Promise<void> | null = null;

export default async function handler(req: any, res: any) {
  dbReady ??= connectDB();
  await dbReady;
  return app(req, res);
}