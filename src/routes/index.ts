import { Router } from 'express';
import uploadRoutes from './upload.routes';
import authRoutes from './auth.routes';
import demoRequestRoutes from './demo-request.routes';
import adminRoutes from './admin.routes';
import eventRoutes from './event.routes';
import complianceRoutes from './compliance.routes';
import adminEmailRoutes from './admin-email.routes';
import adminOverviewRoutes from './admin-overview.routes';
import demoRequestAdminRoutes from './demo-request-admin.routes';
import appealRequestRoutes from './appeal-request.routes';
import rsvpRoutes from './rsvp.routes';
import userSettingsRoutes from './user-settings.routes';

const router = Router();

const API_VERSION = process.env.API_VERSION || 'v1';

router.use(`/${API_VERSION}/upload`, uploadRoutes);
router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/demo-requests`, demoRequestRoutes);
router.use(`/${API_VERSION}/appeals`, appealRequestRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);
router.use(`/${API_VERSION}/admin/overview`, adminOverviewRoutes);
router.use(`/${API_VERSION}/admin/demo-requests`, demoRequestAdminRoutes);
router.use(`/${API_VERSION}/admin/compliance`, complianceRoutes);
router.use(`/${API_VERSION}/admin/email`, adminEmailRoutes);
router.use(`/${API_VERSION}/events`, eventRoutes);
router.use(`/${API_VERSION}/rsvps`, rsvpRoutes);
router.use(`/${API_VERSION}/settings`, userSettingsRoutes);

export default router;
