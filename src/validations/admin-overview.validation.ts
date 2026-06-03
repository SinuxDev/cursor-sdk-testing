import { query } from 'express-validator';

export const adminOverviewValidation = {
  getCharts: [query('range').optional().isIn(['7d', '30d', '90d'])],
};
