import { body, param, query } from 'express-validator';

const demoStatuses = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'scheduled',
  'completed',
  'no_show',
  'won',
  'lost',
  'nurture',
];

const demoReplyTemplates = [
  'acknowledgement',
  'qualified_next_steps',
  'not_a_fit_polite',
  'reschedule_no_show',
];

export const demoRequestAdminValidation = {
  list: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(demoStatuses),
    query('priority').optional().isIn(['low', 'medium', 'high']),
    query('ownerAdminId').optional().isMongoId(),
    query('source').optional().isIn(['public-website', 'authenticated-website']),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('sla').optional().isIn(['all', 'on_time', 'overdue']),
  ],
  getById: [param('id').isMongoId().withMessage('Invalid demo request id')],
  assign: [
    param('id').isMongoId().withMessage('Invalid demo request id'),
    body('ownerAdminId').isMongoId().withMessage('ownerAdminId must be a valid id'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid demo request id'),
    body('status').isIn(demoStatuses).withMessage('Invalid demo status'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
    body('qualificationNotes').optional().trim().isLength({ max: 1500 }),
    body('scheduledAt').optional().isISO8601(),
    body('nextActionAt').optional().isISO8601(),
  ],
  updateFollowUp: [
    param('id').isMongoId().withMessage('Invalid demo request id'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
    body('lastContactAt').optional().isISO8601(),
    body('nextActionAt').optional().isISO8601(),
    body('qualificationNotes').optional().trim().isLength({ max: 1500 }),
    body('priority').optional().isIn(['low', 'medium', 'high']),
  ],
  sendReply: [
    param('id').isMongoId().withMessage('Invalid demo request id'),
    body('templateKey').isIn(demoReplyTemplates).withMessage('Invalid reply template key'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
    body('customMessage').optional().trim().isLength({ max: 1200 }),
    body('scheduleLink').optional().isURL().withMessage('scheduleLink must be a valid URL'),
  ],
  analytics: [query('range').optional().isIn(['7d', '30d', '90d'])],
};
