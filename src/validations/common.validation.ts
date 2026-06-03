import { param, query } from 'express-validator';

export const commonValidation = {
  mongoId: [param('id').isMongoId().withMessage('Invalid ID format')],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .isIn(['asc', 'desc', 'createdAt', '-createdAt', 'name', '-name'])
      .withMessage('Invalid sort parameter'),
  ],

  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
  ],
};
