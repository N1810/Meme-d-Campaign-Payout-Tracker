import { Request, Response, NextFunction } from 'express';
import { SignupSchema, LoginSchema } from '../shared';
import { User } from '../models';
import { hashPassword, comparePassword, signToken } from '../utils/auth';

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = SignupSchema.parse(req.body);

      const existing = await User.findOne({ email: validated.email });
      if (existing) {
        res.status(409).json({ success: false, error: 'User with this email already exists' });
        return;
      }

      const passwordHash = await hashPassword(validated.password);
      const user = await User.create({
        name: validated.name,
        email: validated.email,
        passwordHash,
        role: validated.role,
      });

      const token = signToken({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      });

      // Set HttpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginSchema.parse(req.body);

      const user = await User.findOne({ email: validated.email });
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const isMatch = await comparePassword(validated.password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const token = signToken({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static logout(_req: Request, res: Response): void {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const user = await User.findById(req.user.userId).select('-passwordHash');
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
