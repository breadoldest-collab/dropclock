import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  // 1. Try configured URI first if provided
  if (mongoUri && mongoUri !== 'mongodb://localhost:27017/bms-notifier') {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`[DB] Connected to MongoDB (${mongoUri}) ✓`);
      return;
    } catch (err) {
      console.warn('[DB] Could not connect to remote MongoDB. Falling back to in-memory database...');
    }
  }

  // 2. Try localhost default
  try {
    await mongoose.connect('mongodb://localhost:27017/bms-notifier', { serverSelectionTimeoutMS: 2000 });
    console.log(`[DB] Connected to local MongoDB ✓`);
    return;
  } catch (err) {
    console.log('[DB] Local MongoDB not detected. Starting in-memory zero-config database...');
  }

  // 3. Zero-config in-memory database fallback (for easy testing without installing Mongo)
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`[DB] In-Memory MongoDB running at ${uri} ✓ (Zero-config mode)`);
  } catch (error) {
    console.error('[DB] Database initialization error:', error.message);
  }
}

export default { connectDB };

