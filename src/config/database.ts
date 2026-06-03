import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sinux-boilerplate';

  try {
    const conn = await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Show database name instead of host for better clarity
    const dbName = conn.connection.name;
    const isAtlas = mongodbUri.includes('mongodb+srv') || mongodbUri.includes('mongodb.net');
    const connectionType = isAtlas ? 'MongoDB Atlas' : 'Local MongoDB';

    logger.info(`✅ ${connectionType} Connected: ${dbName}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', { message: err.message, stack: err.stack });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error(
      'MongoDB connection failed:',
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error: String(error) }
    );
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(
      'Error closing MongoDB connection:',
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error: String(error) }
    );
    throw error;
  }
};
