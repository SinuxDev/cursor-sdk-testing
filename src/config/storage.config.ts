import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';
import { s3, s3Config } from './aws.config';
import { AppError } from '../utils/AppError';

const isProduction = process.env.NODE_ENV === 'production';

const uploadDir = path.join(__dirname, '../../uploads');
if (!isProduction && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export interface UploadOptions {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  folder?: string;
  fileTypes?: 'images' | 'documents' | 'all' | 'videos' | 'audio';
}

const mimeTypePresets = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  videos: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  all: [],
};

const extensionPresets: Record<NonNullable<UploadOptions['fileTypes']>, string[]> = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  videos: ['.mp4', '.mpeg', '.mov', '.avi', '.webm'],
  audio: ['.mp3', '.wav', '.ogg', '.webm'],
  all: [],
};

const createFileFilter = (options: UploadOptions = {}) => {
  return (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (options.fileTypes === 'all') {
      cb(null, true);
      return;
    }

    const allowedMimeTypes: string[] = options.allowedMimeTypes
      ? options.allowedMimeTypes
      : options.fileTypes
        ? mimeTypePresets[options.fileTypes]
        : [...mimeTypePresets.images, ...mimeTypePresets.documents];

    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = options.fileTypes
      ? extensionPresets[options.fileTypes]
      : [...extensionPresets.images, ...extensionPresets.documents];

    const isMimeAllowed = allowedMimeTypes.includes(file.mimetype);
    const isExtensionAllowed = allowedExtensions.includes(extension);

    if (isMimeAllowed && isExtensionAllowed) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type or extension', 400));
    }
  };
};

const createLocalStorage = (folder: string = 'uploads') => {
  const localDir = path.join(__dirname, '../../uploads', folder);
  if (!isProduction && !fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, localDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
};

const createS3Storage = (folder: string = 'uploads') => {
  return multerS3({
    s3: s3 as S3Client,
    bucket: s3Config.bucket,
    acl: s3Config.acl,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });
};

export const createUploadMiddleware = (options: UploadOptions = {}) => {
  const folder = options.folder || 'uploads';
  const maxFileSize = options.maxFileSize || 10 * 1024 * 1024;

  return multer({
    storage: isProduction ? createS3Storage(folder) : createLocalStorage(folder),
    fileFilter: createFileFilter(options),
    limits: {
      fileSize: maxFileSize,
    },
  });
};

export const upload = createUploadMiddleware();

export const uploadImages = createUploadMiddleware({
  fileTypes: 'images',
  maxFileSize: 5 * 1024 * 1024,
  folder: 'images',
});

export const uploadEventCovers = createUploadMiddleware({
  fileTypes: 'images',
  maxFileSize: 5 * 1024 * 1024,
  folder: 'events',
});

export const uploadDocuments = createUploadMiddleware({
  fileTypes: 'documents',
  maxFileSize: 20 * 1024 * 1024,
  folder: 'documents',
});

export const uploadVideos = createUploadMiddleware({
  fileTypes: 'videos',
  maxFileSize: 100 * 1024 * 1024,
  folder: 'videos',
});

export const uploadAudio = createUploadMiddleware({
  fileTypes: 'audio',
  maxFileSize: 10 * 1024 * 1024,
  folder: 'audio',
});

export const uploadConfig = {
  isProduction,
  uploadDir,
  maxFileSize: 10 * 1024 * 1024,
  mimeTypePresets,
};
