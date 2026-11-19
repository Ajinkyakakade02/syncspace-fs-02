import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { MemberController } from '../controllers/member.controller.js';
import { PageController } from '../controllers/page.controller.js';
import { ActivityController } from '../controllers/activity.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requireWorkspaceRole } from '../middleware/permissions.middleware.js';

const router = Router();

router.use(authenticateJwt);

// Workspaces
router.post('/', WorkspaceController.create);
router.get('/', WorkspaceController.list);
router.get('/:id', requireWorkspaceRole('VIEWER'), WorkspaceController.getById);
router.patch('/:id', requireWorkspaceRole('ADMIN'), WorkspaceController.update);
router.delete('/:id', requireWorkspaceRole('OWNER'), WorkspaceController.delete);

// Workspace Members
router.get('/:id/members', requireWorkspaceRole('VIEWER'), MemberController.listMembers);
router.post('/:id/invitations', requireWorkspaceRole('ADMIN'), MemberController.invite);
router.patch('/:id/members/:memberId/role', requireWorkspaceRole('ADMIN'), MemberController.updateRole);
router.delete('/:id/members/:memberId', requireWorkspaceRole('ADMIN'), MemberController.removeMember);

// Workspace Pages
router.get('/:id/pages', requireWorkspaceRole('VIEWER'), PageController.list);
router.post('/:id/pages', requireWorkspaceRole('ADMIN'), PageController.create);

// Workspace Activity
router.get('/:id/activity', requireWorkspaceRole('VIEWER'), ActivityController.getWorkspaceActivity);

export default router;
