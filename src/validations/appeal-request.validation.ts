import { body, param, query } from 'express-validator';

export const appealRequestValidation = {
  create: [
    body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
    body('workEmail').isEmail().withMessage('Please provide a valid work email').normalizeEmail(),
    body('company').trim().isLength({ min: 2 }).withMessage('Company is required'),
    body('accountEmail')
      .isEmail()
      .withMessage('Please provide a valid account email')
      .normalizeEmail(),
    body('issueType')
      .isIn([
        'account_suspension',
        'policy_warning',
        'payment_restriction',
        'content_violation',
        'other',
      ])
      .withMessage('Issue type is invalid'),
    body('timeline').trim().isLength({ min: 10, max: 1000 }).withMessage('Timeline is required'),
    body('whatHappened')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('What happened must be between 20 and 2000 characters'),
    body('correctiveActions')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Corrective actions must be between 20 and 2000 characters'),
    body('evidenceLinks').optional().isArray({ max: 8 }),
    body('evidenceLinks.*')
      .optional()
      .isURL()
      .withMessage('Each evidence link must be a valid URL'),
    body('consent').isBoolean().withMessage('Consent is required'),
    body('consent')
      .custom((value) => value === true)
      .withMessage('You must confirm the information is accurate'),
    body('source')
      .optional()
      .isIn(['public-website', 'authenticated-website'])
      .withMessage('Source is invalid'),
  ],
  listAdmin: [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['submitted', 'in_review', 'resolved', 'rejected']),
    query('issueType')
      .optional()
      .isIn([
        'account_suspension',
        'policy_warning',
        'payment_restriction',
        'content_violation',
        'other',
      ]),
    query('source').optional().isIn(['public-website', 'authenticated-website']),
    query('q').optional().trim().isLength({ min: 1, max: 120 }),
  ],
  updateAdminStatus: [
    param('id').isMongoId().withMessage('Invalid appeal request id'),
    body('status')
      .isIn(['submitted', 'in_review', 'resolved', 'rejected'])
      .withMessage('Invalid appeal status'),
  ],
};
