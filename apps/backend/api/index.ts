import dotenv from 'dotenv';
dotenv.config();

import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

const app = createApp();

function applyCors(req: any, res: any) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type,Authorization,idempotency-key',
    );
  }
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to establish MongoDB connection in serverless handler:', err);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }
  return app(req, res);
}
