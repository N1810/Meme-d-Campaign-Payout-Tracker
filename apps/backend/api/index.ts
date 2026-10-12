import dotenv from 'dotenv';
dotenv.config();

import { createApp } from '../src/app';
import { connectDB } from '../src/config/db';

let isConnected = false;

const app = createApp();

export default async function handler(req: any, res: any) {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
}
