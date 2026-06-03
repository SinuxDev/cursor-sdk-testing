import { body } from 'express-validator';

export const demoRequestValidation = {
  create: [
    body('fullName')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters'),
    body('workEmail').isEmail().withMessage('Please provide a valid work email').normalizeEmail(),
    body('company').trim().isLength({ min: 2 }).withMessage('Company is required'),
    body('role').trim().isLength({ min: 2 }).withMessage('Role is required'),
    body('teamSize').trim().notEmpty().withMessage('Team size is required'),
    body('useCase').trim().isLength({ min: 4 }).withMessage('Use case is required'),
    body('source')
      .optional()
      .isIn(['public-website', 'authenticated-website'])
      .withMessage('Source is invalid'),
  ],
};
