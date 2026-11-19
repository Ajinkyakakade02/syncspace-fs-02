import { Router } from 'express';
import { MemberController } from '../controllers/member.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateJwt);

router.post('/:token/accept', MemberController.acceptInvitation);

export default router;
