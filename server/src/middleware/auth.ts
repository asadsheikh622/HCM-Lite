import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { DBService } from '../services/db.service';
import { IUser, UserRole } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Access denied. No authorization token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; role: UserRole };
    const user = await DBService.findUserById(decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid token or inactive user account.' });
      return;
    }

    req.user = user;

    // Check mandatory password change (except on change-password endpoint and logout/me)
    if (
      user.mustChangePassword &&
      !req.path.includes('/auth/change-password') &&
      !req.path.includes('/auth/me') &&
      !req.path.includes('/auth/logout')
    ) {
      res.status(403).json({
        error: 'Password change is required before accessing HCM Lite services.',
        code: 'REQUIRE_PASSWORD_CHANGE',
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Session expired or invalid signature.', details: err.message });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export function enforceEmployeeScope(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // If user is Employee, ensure they only access their own employeeId
  if (req.user.role === 'employee') {
    if (!req.user.employeeId) {
      res.status(403).json({ error: 'Employee account has no linked employee profile.' });
      return;
    }
    // Force employeeId in query or params to caller's own ID
    req.query.employeeId = req.user.employeeId;
    if (req.body && req.body.employeeId && req.body.employeeId !== req.user.employeeId) {
      res.status(403).json({ error: 'Access violation: Employees cannot operate on other employee records.' });
      return;
    }
    if (req.params.id && req.params.id !== req.user.employeeId && req.baseUrl.includes('employees')) {
      res.status(403).json({ error: 'Access violation: You can only view your own employee 360 profile.' });
      return;
    }
  }

  next();
}
