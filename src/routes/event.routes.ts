import { Router } from 'express';
import { uploadEventCovers } from '../config/storage.config';
import { eventController } from '../controllers/event.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validateRequest';
import { eventValidation } from '../validations/event.validation';
import { rsvpValidation } from '../validations/rsvp.validation';
import { rsvpController } from '../controllers/rsvp.controller';
import { requireIdempotency } from '../middlewares/idempotency.middleware';

const router = Router();

router.get(
  '/public',
  validateRequest(eventValidation.listPublicEvents),
  eventController.listPublicEvents
);
router.get(
  '/public/:id',
  validateRequest(eventValidation.getPublicEvent),
  eventController.getPublicEvent
);

router.post(
  '/:id/rsvp',
  authenticate,
  requireRole('attendee', 'organizer', 'admin'),
  validateRequest(rsvpValidation.submitRsvp),
  requireIdempotency({ operation: 'events.submit-rsvp' }),
  rsvpController.submitRsvp
);

router.use(authenticate, requireRole('organizer', 'admin'));

router.post('/upload-cover', uploadEventCovers.single('coverImage'), eventController.uploadCover);

router.post('/', validateRequest(eventValidation.createDraft), eventController.createDraft);
router.patch('/:id', validateRequest(eventValidation.updateEvent), eventController.updateEvent);
router.post(
  '/:id/publish',
  validateRequest(eventValidation.publishEvent),
  eventController.publishEvent
);
router.get('/:id', validateRequest(eventValidation.getMyEvent), eventController.getMyEvent);
router.post(
  '/:id/check-in',
  validateRequest(eventValidation.checkInByQr),
  requireIdempotency({ operation: 'events.check-in-qr' }),
  eventController.checkInByQr
);
router.post(
  '/:id/check-in/ticket',
  validateRequest(eventValidation.checkInByTicket),
  requireIdempotency({ operation: 'events.check-in-ticket' }),
  eventController.checkInByTicket
);
router.post(
  '/:id/check-in/undo',
  validateRequest(eventValidation.undoCheckIn),
  requireIdempotency({ operation: 'events.undo-check-in' }),
  eventController.undoCheckIn
);
router.get(
  '/:id/attendance',
  validateRequest(eventValidation.getAttendance),
  eventController.getAttendance
);
router.get(
  '/:id/attendees',
  validateRequest(eventValidation.listEventAttendees),
  eventController.listEventAttendees
);
router.get(
  '/:id/attendees/export',
  validateRequest(eventValidation.listEventAttendees),
  eventController.exportEventAttendeesCsv
);
router.post(
  '/attendees/export-bulk',
  validateRequest(eventValidation.exportBulkAttendees),
  eventController.exportBulkEventAttendeesXlsx
);
router.get('/', validateRequest(eventValidation.listMyEvents), eventController.listMyEvents);

export default router;
