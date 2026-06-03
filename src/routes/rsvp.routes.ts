import { Router } from 'express';
import { rsvpController } from '../controllers/rsvp.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { rsvpValidation } from '../validations/rsvp.validation';

const router = Router();

router.use(authenticate, requireRole('attendee', 'organizer', 'admin'));

router.get('/my', rsvpController.listMyRsvps);
router.get(
  '/my/managed',
  validateRequest(rsvpValidation.listManagedMyRsvps),
  rsvpController.listManagedMyRsvps
);
router.get('/:id/ticket', validateRequest(rsvpValidation.cancelRsvp), rsvpController.getMyTicket);
router.delete('/:id', validateRequest(rsvpValidation.cancelRsvp), rsvpController.cancelRsvp);

export default router;
