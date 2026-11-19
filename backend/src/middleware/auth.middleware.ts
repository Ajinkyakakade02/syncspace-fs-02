import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { UserPayload } from '../types/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateJwt = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      cursorColor: payload.cursorColor,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      next(UnauthorizedError('Token expired', 'TOKEN_EXPIRED'));
    } else if (err.name === 'JsonWebTokenError') {
      next(UnauthorizedError('Invalid token', 'INVALID_TOKEN'));
    } else {
      next(err);
    }
  }
};
