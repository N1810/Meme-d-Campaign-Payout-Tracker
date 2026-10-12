import dotenv from 'dotenv';
dotenv.config();

import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

const app = createApp();

export default async function handler(req: any, res: any) {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to establish MongoDB connection in serverless handler:', err);
    return res.status(500).json({ success: false, error: 'Database connection failed' });
  }
  return app(req, res);
}
