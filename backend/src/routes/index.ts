import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import pageRoutes from './page.routes.js';
import commentRoutes from './comment.routes.js';
import invitationRoutes from './invitation.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/pages', pageRoutes);
router.use('/comments', commentRoutes);
router.use('/invitations', invitationRoutes);
router.use('/health', healthRoutes);

export default router;
