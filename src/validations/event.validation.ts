import { body, param, query } from 'express-validator';

const EVENT_CATEGORY_OPTIONS = [
  'conference',
  'workshop',
  'meetup',
  'webinar',
  'networking',
  'hackathon',
  'concert',
  'festival',
  'sports',
  'exhibition',
  'charity',
  'other',
] as const;

const isoDateField = (field: string, message: string) =>
  body(field).isISO8601({ strict: true, strictSeparator: true }).withMessage(message).toDate();

const optionalIsoDateField = (field: string, message: string) =>
  body(field)
    .optional({ nullable: true })
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage(message)
    .toDate();

const isValidPublicUrlOrUploadPath = (value: unknown): boolean => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  if (value.startsWith('/uploads/')) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const eventValidation = {
  createDraft: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 140 })
      .withMessage('Title must be 3-140 characters'),
    body('shortSummary')
      .trim()
      .isLength({ min: 10, max: 160 })
      .withMessage('Short summary must be 10-160 characters'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 5000 })
      .withMessage('Description must be 20-5000 characters'),
    body('category').isIn(EVENT_CATEGORY_OPTIONS).withMessage('Category is invalid'),
    body('customCategory')
      .optional()
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('customCategory must be 2-60 characters'),
    body('tags')
      .optional()
      .isArray({ max: 12 })
      .withMessage('Tags must be an array with up to 12 items'),
    body('tags.*').optional().trim().isLength({ min: 1, max: 40 }),
    body('coverImage')
      .optional()
      .custom((value) => isValidPublicUrlOrUploadPath(value))
      .withMessage('coverImage must be a valid URL or upload path'),
    body('attendanceMode')
      .isIn(['in_person', 'online', 'hybrid'])
      .withMessage('attendanceMode is invalid'),
    body('venueName').optional().trim().isLength({ min: 2, max: 120 }),
    body('addressLine1').optional().trim().isLength({ min: 2, max: 160 }),
    body('addressLine2').optional().trim().isLength({ max: 160 }),
    body('city').optional().trim().isLength({ min: 2, max: 80 }),
    body('state').optional().trim().isLength({ max: 80 }),
    body('country').optional().trim().isLength({ min: 2, max: 80 }),
    body('postalCode').optional().trim().isLength({ max: 20 }),
    body('onlineEventUrl').optional().isURL().withMessage('onlineEventUrl must be a valid URL'),
    isoDateField('startDateTime', 'startDateTime must be a valid ISO datetime'),
    isoDateField('endDateTime', 'endDateTime must be a valid ISO datetime'),
    body('timezone').trim().isLength({ min: 2, max: 100 }).withMessage('Timezone is invalid'),
    optionalIsoDateField('registrationOpenAt', 'registrationOpenAt must be a valid ISO datetime'),
    optionalIsoDateField('registrationCloseAt', 'registrationCloseAt must be a valid ISO datetime'),
    body('capacity')
      .isInt({ min: 1, max: 1_000_000 })
      .withMessage('Capacity must be at least 1')
      .toInt(),
    body('rsvpLimit')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 1_000_000 })
      .withMessage('RSVP limit must be at least 1')
      .toInt(),
    body('visibility')
      .optional()
      .isIn(['public', 'unlisted', 'private'])
      .withMessage('Visibility is invalid'),
    body('organizerName')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Organizer name must be 2-120 characters'),
    body('organizerUrl').optional().isURL().withMessage('organizerUrl must be a valid URL'),
    body('contactEmail')
      .isEmail()
      .withMessage('contactEmail must be a valid email')
      .normalizeEmail(),
    body('refundPolicy').optional().trim().isLength({ max: 2000 }),
    body('tickets').optional().isArray({ min: 0, max: 20 }).withMessage('tickets must be an array'),
    body('tickets.*.name').optional().trim().isLength({ min: 2, max: 80 }),
    body('tickets.*.type').optional().isIn(['free', 'paid']),
    body('tickets.*.quantity').optional().isInt({ min: 1, max: 1_000_000 }).toInt(),
    body('tickets.*.price').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
    body('tickets.*.currency').optional().isLength({ min: 3, max: 3 }).toUpperCase(),
    body('tickets.*.salesStartAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('tickets.*.salesEndAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('tickets.*.minPerOrder').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('tickets.*.maxPerOrder').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('attendeeQuestions').optional().isArray({ max: 20 }),
    body('attendeeQuestions.*.label').optional().trim().isLength({ min: 2, max: 120 }),
    body('attendeeQuestions.*.type').optional().isIn(['text', 'textarea', 'select', 'checkbox']),
    body('attendeeQuestions.*.required').optional().isBoolean().toBoolean(),
    body('attendeeQuestions.*.options').optional().isArray({ max: 20 }),
    body('attendeeQuestions.*.options.*').optional().trim().isLength({ min: 1, max: 100 }),
  ],

  updateEvent: [
    param('id').isMongoId().withMessage('Invalid event id'),
    body().isObject().withMessage('Request body must be an object'),
    body('title').optional().trim().isLength({ min: 3, max: 140 }),
    body('shortSummary').optional().trim().isLength({ min: 10, max: 160 }),
    body('description').optional().trim().isLength({ min: 20, max: 5000 }),
    body('category').optional().isIn(EVENT_CATEGORY_OPTIONS),
    body('customCategory').optional().trim().isLength({ min: 2, max: 60 }),
    body('tags').optional().isArray({ max: 12 }),
    body('tags.*').optional().trim().isLength({ min: 1, max: 40 }),
    body('coverImage')
      .optional()
      .custom((value) => isValidPublicUrlOrUploadPath(value))
      .withMessage('coverImage must be a valid URL or upload path'),
    body('attendanceMode').optional().isIn(['in_person', 'online', 'hybrid']),
    body('venueName').optional().trim().isLength({ min: 2, max: 120 }),
    body('addressLine1').optional().trim().isLength({ min: 2, max: 160 }),
    body('addressLine2').optional().trim().isLength({ max: 160 }),
    body('city').optional().trim().isLength({ min: 2, max: 80 }),
    body('state').optional().trim().isLength({ max: 80 }),
    body('country').optional().trim().isLength({ min: 2, max: 80 }),
    body('postalCode').optional().trim().isLength({ max: 20 }),
    body('onlineEventUrl').optional().isURL(),
    body('startDateTime')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('endDateTime')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('timezone').optional().trim().isLength({ min: 2, max: 100 }),
    body('registrationOpenAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('registrationCloseAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('capacity').optional().isInt({ min: 1, max: 1_000_000 }).toInt(),
    body('rsvpLimit')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 1_000_000 })
      .withMessage('RSVP limit must be at least 1')
      .toInt(),
    body('visibility').optional().isIn(['public', 'unlisted', 'private']),
    body('organizerName').optional().trim().isLength({ min: 2, max: 120 }),
    body('organizerUrl').optional().isURL(),
    body('contactEmail').optional().isEmail().normalizeEmail(),
    body('refundPolicy').optional().trim().isLength({ max: 2000 }),
    body('tickets').optional().isArray({ min: 0, max: 20 }),
    body('tickets.*.name').optional().trim().isLength({ min: 2, max: 80 }),
    body('tickets.*.type').optional().isIn(['free', 'paid']),
    body('tickets.*.quantity').optional().isInt({ min: 1, max: 1_000_000 }).toInt(),
    body('tickets.*.price').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
    body('tickets.*.currency').optional().isLength({ min: 3, max: 3 }).toUpperCase(),
    body('tickets.*.salesStartAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('tickets.*.salesEndAt')
      .optional({ nullable: true })
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate(),
    body('tickets.*.minPerOrder').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('tickets.*.maxPerOrder').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('attendeeQuestions').optional().isArray({ max: 20 }),
    body('attendeeQuestions.*.label').optional().trim().isLength({ min: 2, max: 120 }),
    body('attendeeQuestions.*.type').optional().isIn(['text', 'textarea', 'select', 'checkbox']),
    body('attendeeQuestions.*.required').optional().isBoolean().toBoolean(),
    body('attendeeQuestions.*.options').optional().isArray({ max: 20 }),
    body('attendeeQuestions.*.options.*').optional().trim().isLength({ min: 1, max: 100 }),
  ],

  publishEvent: [param('id').isMongoId().withMessage('Invalid event id')],

  getPublicEvent: [param('id').isMongoId().withMessage('Invalid event id')],

  listPublicEvents: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
    query('category').optional().trim().isLength({ min: 2, max: 60 }),
    query('attendanceMode').optional().isIn(['in_person', 'online', 'hybrid']),
    query('startDateFrom')
      .optional()
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage('startDateFrom must be an ISO datetime'),
    query('startDateTo')
      .optional()
      .isISO8601({ strict: true, strictSeparator: true })
      .withMessage('startDateTo must be an ISO datetime'),
    query('sort').optional().isIn(['soonest', 'latest']),
  ],

  getMyEvent: [param('id').isMongoId().withMessage('Invalid event id')],

  listMyEvents: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],

  checkInByQr: [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('qrCode').trim().notEmpty().withMessage('qrCode is required'),
    body('source').isIn(['scanner', 'manual']).withMessage('source must be scanner or manual'),
  ],

  checkInByTicket: [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('ticketId').isMongoId().withMessage('ticketId is required'),
    body('source').isIn(['lookup']).withMessage('source must be lookup'),
  ],

  undoCheckIn: [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('ticketId').isMongoId().withMessage('ticketId is required'),
  ],

  getAttendance: [param('id').isMongoId().withMessage('Invalid event id')],

  listEventAttendees: [
    param('id').isMongoId().withMessage('Invalid event id'),
    query('status').optional().isIn(['all', 'registered', 'waitlisted', 'cancelled']),
    query('checkIn').optional().isIn(['all', 'checked_in', 'not_checked_in']),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],

  exportBulkAttendees: [
    body('eventIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('eventIds must contain between 1 and 50 events'),
    body('eventIds.*').isMongoId().withMessage('Each event id must be valid'),
    body('status').optional().isIn(['all', 'registered', 'waitlisted', 'cancelled']),
    body('checkIn').optional().isIn(['all', 'checked_in', 'not_checked_in']),
    body('q').optional().trim().isLength({ min: 1, max: 120 }),
  ],
};
