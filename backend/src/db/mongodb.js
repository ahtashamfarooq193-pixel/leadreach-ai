import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectDB() {
  try {
    // Add connection timeout of 5 seconds
    const conn = await Promise.race([
      mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);
    console.log(`✅ Connected to MongoDB Atlas / Local at host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`\n⚠️  MongoDB Connection Error: ${error.message}`);
    console.warn('ℹ️  Backend server is running in OFFLINE MODE (Mock Data)');
    console.warn('📌 To enable real database: Configure MONGODB_URI in .env or start MongoDB locally\n');
  }
}
