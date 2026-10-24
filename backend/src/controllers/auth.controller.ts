import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler, sendCreated, sendSuccess } from '../helpers';
import { AuthRequest } from '../types';

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await AuthService.register(req.body);
  sendCreated(res, 'User registered successfully', result);
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await AuthService.login(req.body);
  sendSuccess(res, 'User logged in successfully', result);
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await AuthService.getProfile(req.user!.userId);
  sendSuccess(res, 'Current user profile retrieved', user);
});
