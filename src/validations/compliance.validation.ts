import { body, param, query } from 'express-validator';

export const complianceValidation = {
  listCases: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['open', 'in_review', 'actioned', 'resolved']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],

  createCase: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 120 })
      .withMessage('Title must be between 3 and 120 characters'),
    body('description')
      .trim()
      .isLength({ min: 5, max: 2000 })
      .withMessage('Description must be between 5 and 2000 characters'),
    body('category')
      .isIn(['account_abuse', 'content_policy', 'payment_risk', 'policy_violation', 'other'])
      .withMessage('Category is invalid'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Severity is invalid'),
    body('linkedUserId').optional().isMongoId().withMessage('linkedUserId must be valid'),
    body('linkedEventId').optional().isMongoId().withMessage('linkedEventId must be valid'),
    body('assignedAdminId').optional().isMongoId().withMessage('assignedAdminId must be valid'),
    body('dueAt').optional().isISO8601().withMessage('dueAt must be valid ISO datetime'),
  ],

  updateCaseStatus: [
    param('id').isMongoId().withMessage('Invalid case id'),
    body('status')
      .isIn(['open', 'in_review', 'actioned', 'resolved'])
      .withMessage('Status is invalid'),
    body('resolutionNote').optional().trim().isLength({ max: 2000 }),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],
};
