import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.patch('/:commentId', CommentController.update);
router.delete('/:commentId', CommentController.delete);
router.patch('/:commentId/resolve', CommentController.toggleResolve);
router.post('/:commentId/replies', CommentController.createReply);
router.delete('/:commentId/replies/:replyId', CommentController.deleteReply);

export default router;
