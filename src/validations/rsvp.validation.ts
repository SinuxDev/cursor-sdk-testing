import { body, param, query } from 'express-validator';

export const rsvpValidation = {
  submitRsvp: [
    param('id').isMongoId().withMessage('Invalid event id'),
    body('formResponses')
      .optional()
      .isArray({ max: 20 })
      .withMessage('formResponses must be an array'),
    body('formResponses.*.question')
      .optional()
      .trim()
      .isLength({ min: 1, max: 120 })
      .withMessage('Question must be 1-120 characters'),
    body('formResponses.*.answer')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Answer must be 1-500 characters'),
  ],

  cancelRsvp: [param('id').isMongoId().withMessage('Invalid RSVP id')],

  listManagedMyRsvps: [
    query('tab')
      .optional()
      .isIn(['upcoming', 'waitlisted', 'past', 'cancelled', 'all'])
      .withMessage('tab must be one of upcoming, waitlisted, past, cancelled, all'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 120 })
      .withMessage('search must be up to 120 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be an integer greater than 0')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit must be an integer between 1 and 50')
      .toInt(),
    query('sort')
      .optional()
      .isIn(['eventStartAsc', 'eventStartDesc', 'createdDesc'])
      .withMessage('sort must be eventStartAsc, eventStartDesc, or createdDesc'),
  ],
};
