import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/AppError';
import { fileService } from '../services/file.service';
import { processUploadedFile, processUploadedFiles } from '../middlewares/uploadMiddleware';

class UploadController {
  uploadSingle = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileInfo = processUploadedFile(req.file);

    ApiResponse.success(res, fileInfo, 'File uploaded successfully');
  });

  uploadMultiple = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const files = processUploadedFiles(req.files as Express.Multer.File[]);

    ApiResponse.success(res, { files }, 'Files uploaded successfully');
  });

  deleteFile = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      throw new AppError('File URL is required', 400);
    }

    await fileService.deleteFile(fileUrl);

    ApiResponse.success(res, null, 'File deleted successfully');
  });

  getFileMetadata = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { fileUrl } = req.query;

    if (!fileUrl || typeof fileUrl !== 'string') {
      throw new AppError('File URL is required', 400);
    }

    const metadata = await fileService.getFileMetadata(fileUrl);

    ApiResponse.success(res, metadata, 'File metadata retrieved successfully');
  });
}

export const uploadController = new UploadController();
