import { body } from 'express-validator';

export const authValidation = {
  register: [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('role').optional().isIn(['attendee', 'organizer']).withMessage('Role is invalid'),
  ],

  login: [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  socialLogin: [
    body('provider').isIn(['google', 'github']).withMessage('Provider is invalid'),
    body('providerId').notEmpty().withMessage('Provider ID is required'),
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('avatar').optional().isString().withMessage('Avatar must be a string URL'),
    body('role').optional().isIn(['attendee', 'organizer']).withMessage('Role is invalid'),
  ],

  upgradeRole: [
    body('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['organizer'])
      .withMessage('Role upgrade is invalid'),
  ],
};
