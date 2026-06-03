import { body, param, query } from 'express-validator';

export const adminValidation = {
  listUsers: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
    query('role').optional().isIn(['attendee', 'organizer', 'admin']),
    query('isSuspended').optional().isIn(['true', 'false']),
    query('parentId').optional().isMongoId().withMessage('Invalid parent user id'),
  ],

  updateRole: [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['attendee', 'organizer', 'admin'])
      .withMessage('Role is invalid'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],

  updateSuspension: [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('isSuspended').isBoolean().withMessage('isSuspended must be boolean'),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],

  updateParent: [
    param('id').isMongoId().withMessage('Invalid user id'),
    body('parentId')
      .custom((value, { req }) => {
        if (!Object.prototype.hasOwnProperty.call(req.body, 'parentId')) {
          throw new Error('parentId is required');
        }

        if (value === null) {
          return true;
        }

        if (typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) {
          return true;
        }

        throw new Error('parentId must be a valid MongoDB id or null');
      }),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],

  listAuditLogs: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('action')
      .optional()
      .isIn([
        'user.role.updated',
        'user.suspension.updated',
        'user.parent.updated',
        'compliance.case.created',
        'compliance.case.updated',
        'compliance.case.status.updated',
        'admin.email.campaign.sent',
        'admin.settings.updated',
        'demo.request.assigned',
        'demo.request.status.updated',
        'demo.request.followup.updated',
        'demo.request.reply.sent',
      ]),
    query('targetUserId').optional().isMongoId(),
    query('actorUserId').optional().isMongoId(),
  ],

  listEvents: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
    query('organizer').optional().trim().isLength({ min: 1, max: 120 }),
    query('organizerId').optional().isMongoId(),
    query('status').optional().isIn(['draft', 'published', 'cancelled']),
    query('startDateFrom').optional().isISO8601(),
    query('startDateTo').optional().isISO8601(),
    query('sort').optional().isIn(['start_asc', 'start_desc', 'created_desc']),
  ],

  getEventById: [param('id').isMongoId().withMessage('Invalid event id')],
};
