import app from '../src/server.js';
import { connectDB } from '../src/db/mongodb.js';
import { config } from '../src/config/index.js';

// Connect MongoDB on cold start (serverless); startServer() does not run on Vercel
if (!config.skipMongoDB && config.mongodbUri) {
  connectDB().catch((err) => {
    console.warn('MongoDB connection failed on Vercel:', err.message);
  });
}

export default app;
