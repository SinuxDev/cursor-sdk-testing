import { body, query } from 'express-validator';

export const uploadValidation = {
  fileUrlBody: [
    body('fileUrl')
      .isString()
      .withMessage('fileUrl must be a string')
      .trim()
      .notEmpty()
      .withMessage('fileUrl is required'),
  ],

  fileUrlQuery: [
    query('fileUrl')
      .isString()
      .withMessage('fileUrl must be a string')
      .trim()
      .notEmpty()
      .withMessage('fileUrl is required'),
  ],
};
