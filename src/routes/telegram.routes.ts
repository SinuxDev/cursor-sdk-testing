import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller';

const router = Router();

router.get('/health', telegramController.health);
router.post('/webhook/:secret', telegramController.webhook);

export default router;
