import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: isProduction
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined,
});

if (isProduction) {
  logger.info('AWS S3 configured for production with SDK v3');
}

export const s3Config = {
  bucket: process.env.AWS_S3_BUCKET || '',
  region: process.env.AWS_REGION || 'us-east-1',
  acl: 'public-read' as const,
};
