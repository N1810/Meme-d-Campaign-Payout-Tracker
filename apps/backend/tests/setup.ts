import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored
}

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

export async function setupTestDatabase(): Promise<string> {
  const envUri = process.env.MONGODB_URI;

  // Use MongoDB Atlas test database when credentials are configured
  if (envUri && envUri.includes('mongodb+srv://')) {
    const testUri = envUri.replace(/\/[^/?]+(\?|$)/, '/memed_test_db$1');
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 15000 });
    return testUri;
  }

  // Fallback to in-memory mongodb
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}
