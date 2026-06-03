import { body, param, query } from 'express-validator';

export const adminEmailValidation = {
  sendCampaign: [
    body('audienceMode')
      .isIn(['segment', 'manual'])
      .withMessage('audienceMode must be segment or manual'),
    body('templateKey')
      .isIn([
        'custom',
        'policy_warning',
        'suspension_notice',
        'reinstatement_notice',
        'policy_update',
      ])
      .withMessage('templateKey is invalid'),
    body('subject')
      .trim()
      .isLength({ min: 3, max: 160 })
      .withMessage('Subject must be between 3 and 160 characters'),
    body('body')
      .trim()
      .isLength({ min: 5, max: 10000 })
      .withMessage('Body must be between 5 and 10000 characters'),
    body('targetRoles').isArray({ min: 1 }).withMessage('targetRoles must be a non-empty array'),
    body('targetRoles.*')
      .isIn(['attendee', 'organizer', 'admin'])
      .withMessage('targetRoles contains invalid role'),
    body('targetStatus')
      .isIn(['all', 'active', 'suspended'])
      .withMessage('targetStatus is invalid'),
    body('selectedUserIds')
      .optional()
      .isArray({ min: 1 })
      .withMessage('selectedUserIds must be a non-empty array when provided'),
    body('selectedUserIds.*')
      .optional()
      .isMongoId()
      .withMessage('selectedUserIds contains invalid id'),
    body('selectedUserIds').custom((value, { req }) => {
      if (req.body.audienceMode === 'manual') {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('selectedUserIds is required when audienceMode is manual');
        }
      }

      return true;
    }),
    body('reason')
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage('Reason must be between 3 and 300 characters'),
  ],

  listCampaigns: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],

  listCampaignDeliveryLogs: [
    param('id').isMongoId().withMessage('Invalid campaign id'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
};
