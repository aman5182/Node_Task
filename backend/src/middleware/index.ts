import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodSchema, ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../helpers';
import { AuthRequest, AuthUserPayload } from '../types';

/**
 * JWT Authentication Middleware
 * Validates Bearer token from Authorization header and attaches user to request
 */
export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(401, 'Authentication token missing');
    }

    const decoded = jwt.verify(token, env.jwtSecret) as AuthUserPayload;
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new AppError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
};

/**
 * Generic Zod Request Validation Middleware
 * Validates body, query, and params against the provided Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));
        next(new AppError(400, 'Validation failed', formattedErrors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown[] | undefined = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ID format for ${err.path}: ${err.value}`;
  } else if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    const field =
      Object.keys((err as { keyPattern?: Record<string, number> }).keyPattern || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Already exists.`;
  } else {
    console.error('Unhandled Application Error:', err);
    if (env.nodeEnv === 'development') {
      message = err.message || message;
    }
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errors && { errors }),
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
};
