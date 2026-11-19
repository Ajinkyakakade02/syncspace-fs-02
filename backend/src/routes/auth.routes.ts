import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticateJwt, AuthController.logout);
router.get('/me', authenticateJwt, AuthController.getMe);
router.post('/change-password', authenticateJwt, AuthController.changePassword);

export default router;
