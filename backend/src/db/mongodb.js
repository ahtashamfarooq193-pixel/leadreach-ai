import mongoose from 'mongoose';
import { config } from '../config/index.js';

export async function connectDB() {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`Connected to MongoDB Atlas / Local at host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn('Backend server will continue running, but DB queries will fail until MongoDB is active. Please configure a valid MONGODB_URI (e.g. from MongoDB Atlas) in your .env');
  }
}
