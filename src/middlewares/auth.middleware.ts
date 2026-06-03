import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

interface JwtPayload {
  sub?: string;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    next(new AppError('JWT secret is not configured', 500));
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Authorization token is required', 401));
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!decoded.sub) {
      next(new AppError('Invalid token payload', 401));
      return;
    }

    const user = await userRepository.findById(decoded.sub);

    if (!user) {
      next(new AppError('User not found', 401));
      return;
    }

    if (user.isSuspended) {
      next(new AppError('Account is suspended', 403));
      return;
    }

    req.user = user;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
};

export const requireRole = (...roles: Array<'attendee' | 'organizer' | 'admin'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Forbidden', 403));
      return;
    }

    next();
  };
};
