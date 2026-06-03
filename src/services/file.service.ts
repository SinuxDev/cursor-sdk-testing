import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { s3, s3Config } from '../config/aws.config';
import { uploadConfig } from '../config/storage.config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

class FileService {
  private isAllowedManagedUrl(fileUrl: string): boolean {
    if (fileUrl.startsWith('/uploads/')) {
      return true;
    }

    const s3Prefix = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/uploads/`;
    return Boolean(s3Config.bucket) && fileUrl.startsWith(s3Prefix);
  }

  private resolveSafeLocalPath(fileUrl: string): string {
    const decodedUrl = decodeURIComponent(fileUrl);

    if (!decodedUrl.startsWith('/uploads/')) {
      throw new AppError('Invalid file URL', 400);
    }

    const relativePath = decodedUrl.slice('/uploads/'.length);

    if (!relativePath || relativePath.includes('..')) {
      throw new AppError('Invalid file URL', 400);
    }

    const resolvedPath = path.resolve(uploadConfig.uploadDir, relativePath);
    const uploadRoot = path.resolve(uploadConfig.uploadDir);

    if (!resolvedPath.startsWith(uploadRoot)) {
      throw new AppError('Invalid file URL', 400);
    }

    return resolvedPath;
  }

  private validateManagedFileUrl(fileUrl: string): void {
    if (!this.isAllowedManagedUrl(fileUrl)) {
      throw new AppError('File URL is not managed by this service', 400);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      this.validateManagedFileUrl(fileUrl);

      if (uploadConfig.isProduction) {
        await this.deleteFromS3(fileUrl);
      } else {
        await this.deleteFromLocal(fileUrl);
      }
      logger.info(`File deleted successfully: ${fileUrl}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  private async deleteFromS3(fileUrl: string): Promise<void> {
    const key = this.extractS3KeyFromUrl(fileUrl);

    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    await s3.send(command);
  }

  private async deleteFromLocal(fileUrl: string): Promise<void> {
    const filePath = this.resolveSafeLocalPath(fileUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private extractS3KeyFromUrl(url: string): string {
    const s3Prefix = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/`;

    if (!url.startsWith(s3Prefix)) {
      throw new AppError('Invalid S3 file URL', 400);
    }

    return url.slice(s3Prefix.length);
  }

  async optimizeImage(
    filePath: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
    } = {}
  ): Promise<Buffer> {
    const { width = 800, height, quality = 80 } = options;

    return await sharp(filePath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
  }

  async createThumbnail(filePath: string, width: number = 200): Promise<Buffer> {
    return await sharp(filePath)
      .resize(width, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70 })
      .toBuffer();
  }

  getFileUrl(filename: string): string {
    if (uploadConfig.isProduction) {
      return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/uploads/${filename}`;
    } else {
      return `/uploads/${filename}`;
    }
  }

  async getFileMetadata(
    fileUrl: string
  ): Promise<HeadObjectCommandOutput | { ContentLength: number; LastModified: Date }> {
    this.validateManagedFileUrl(fileUrl);

    if (uploadConfig.isProduction) {
      const key = this.extractS3KeyFromUrl(fileUrl);

      const command = new HeadObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      });

      return await s3.send(command);
    } else {
      const filePath = this.resolveSafeLocalPath(fileUrl);

      if (!fs.existsSync(filePath)) {
        throw new AppError('File not found', 404);
      }

      const stats = fs.statSync(filePath);
      return {
        ContentLength: stats.size,
        LastModified: stats.mtime,
      };
    }
  }

  async uploadBuffer(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    if (uploadConfig.isProduction) {
      const command = new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: `uploads/${filename}`,
        Body: buffer,
        ContentType: mimetype,
        ACL: s3Config.acl,
      });

      await s3.send(command);
      return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/uploads/${filename}`;
    } else {
      const filePath = path.join(uploadConfig.uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      return this.getFileUrl(filename);
    }
  }
}

export const fileService = new FileService();
