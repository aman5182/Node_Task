import express, { Application, Request, Response, NextFunction } from 'express';
import apiRouter from './routes';
import { errorHandler } from './middleware';
import { AppError } from './helpers';

const app: Application = express();

// Built-in CORS Middleware (no external package required)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Chat Backend API is running',
    version: '1.0.0',
    prefix: '/api/v1',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/auth/me',
      },
      chat: {
        createOrGetChat: 'POST /api/v1/chat/create',
        sendMessage: 'POST /api/v1/chat/:chatId/message/send',
        getMessages: 'GET /api/v1/chat/:chatId/messages',
        markMessageRead: 'POST /api/v1/chat/:chatId/message/:messageId/read',
        updateLastSeen: 'POST /api/v1/chat/:chatId/lastseen',
      },
      user: {
        listUserChats: 'GET /api/v1/user/:userId/chats',
        me: 'GET /api/v1/user/me',
      },
    },
  });
});

// Mount consolidated API v1 router
app.use('/api/v1', apiRouter);

// 404 Route Handler
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Cannot find route ${req.method} ${req.originalUrl} on this server`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
