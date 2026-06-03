import { Router } from 'express';
import { upload } from '../config/storage.config';
import { uploadController } from '../controllers/upload.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { uploadValidation } from '../validations/upload.validation';

const router = Router();

router.use(authenticate, requireRole('organizer', 'admin'));

router.post('/single', upload.single('file'), uploadController.uploadSingle);

router.post('/multiple', upload.array('files', 10), uploadController.uploadMultiple);

router.delete(
  '/delete',
  validateRequest(uploadValidation.fileUrlBody),
  uploadController.deleteFile
);

router.get(
  '/metadata',
  validateRequest(uploadValidation.fileUrlQuery),
  uploadController.getFileMetadata
);

export default router;
