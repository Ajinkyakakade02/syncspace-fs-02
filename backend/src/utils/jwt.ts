import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AccessTokenPayload, CollabTicketPayload, RefreshTokenPayload } from '../types/auth.js';

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as any,
  });
};

export const signRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
  });
};

export const signCollabTicket = (payload: Omit<CollabTicketPayload, 'type'>): string => {
  // Short-lived single-use collaboration ticket valid for 60 seconds
  return jwt.sign({ ...payload, type: 'collab-ticket' }, env.COLLAB_TICKET_SECRET, {
    expiresIn: '60s',
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const verifyCollabTicket = (token: string): CollabTicketPayload => {
  return jwt.verify(token, env.COLLAB_TICKET_SECRET) as CollabTicketPayload;
};
