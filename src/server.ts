import 'dotenv/config';
import app from './app';
import { connectDB } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

const validateRequiredEnv = () => {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredVars.filter((envName) => !process.env[envName]);

  if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

const startServer = async () => {
  try {
    validateRequiredEnv();
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`📦 Storage: ${process.env.NODE_ENV === 'production' ? 'AWS S3' : 'Local'}`);

      if (process.send) {
        process.send('ready');
      }
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const mongoose = await import('mongoose');
          await mongoose.default.connection.close();
          logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        gracefulShutdown('PM2');
      }
    });

    process.on('unhandledRejection', (reason: Error) => {
      logger.error('Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
