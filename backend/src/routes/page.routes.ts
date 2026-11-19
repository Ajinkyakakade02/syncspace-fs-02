import { Router } from 'express';
import { PageController } from '../controllers/page.controller.js';
import { CollaborationController } from '../controllers/collaboration.controller.js';
import { CommentController } from '../controllers/comment.controller.js';
import { VersionController } from '../controllers/version.controller.js';
import { ActivityController } from '../controllers/activity.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { requirePageAccess } from '../middleware/permissions.middleware.js';

const router = Router();

router.use(authenticateJwt);

// Page Details & Updates
router.get('/:pageId', requirePageAccess('VIEWER'), PageController.getById);
router.patch('/:pageId', requirePageAccess('EDITOR'), PageController.update);
router.delete('/:pageId', requirePageAccess('ADMIN'), PageController.delete);

// Collaboration Handshake Ticket & Status
router.post('/:pageId/collaboration-ticket', requirePageAccess('VIEWER'), CollaborationController.getTicket);
router.get('/:pageId/collaboration-status', requirePageAccess('VIEWER'), CollaborationController.getStatus);
router.get('/:pageId/collaboration-metadata', requirePageAccess('VIEWER'), CollaborationController.getMetadata);

// Comments & Replies on Page
router.get('/:pageId/comments', requirePageAccess('VIEWER'), CommentController.list);
router.post('/:pageId/comments', requirePageAccess('COMMENTER'), CommentController.create);

// Version History on Page
router.get('/:pageId/versions', requirePageAccess('EDITOR'), VersionController.list);
router.post('/:pageId/versions', requirePageAccess('ADMIN'), VersionController.create);
router.get('/:pageId/versions/:versionId', requirePageAccess('EDITOR'), VersionController.getById);
router.post('/:pageId/versions/:versionId/restore', requirePageAccess('ADMIN'), VersionController.restore);

// Page Activity
router.get('/:pageId/activity', requirePageAccess('VIEWER'), ActivityController.getPageActivity);

export default router;
