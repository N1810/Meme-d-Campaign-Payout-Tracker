import dns from 'dns';
// Resolve DNS SRV query failures on Windows ISPs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored if custom servers are not permitted
}

import mongoose from 'mongoose';

declare global {
  var mongooseConnection: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  // If already connected, return cached connection
  if (mongoose.connection.readyState === 1 && cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    cached!.promise = mongoose
      .connect(mongoUri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((m) => {
        console.log(`[MongoDB] Connected successfully to ${m.connection.host}`);
        return m;
      });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (error) {
    cached!.promise = null;
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }

  return cached!.conn;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
