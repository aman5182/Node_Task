import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { ChatController } from '../controllers/chat.controller';
import { MessageController } from '../controllers/message.controller';
import { authenticate, validate } from '../middleware';
import { registerSchema, loginSchema } from '../validations/auth.validation';
import { createChatSchema, userChatsParamSchema } from '../validations/chat.validation';
import {
  sendMessageSchema,
  getMessagesSchema,
  markReadSchema,
  updateLastSeenSchema,
} from '../validations/message.validation';

const router = Router();

// ==========================================
// 1. AUTH ROUTES (/api/v1/auth)
// ==========================================
export const authRouter = Router();
authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.get('/me', authenticate, getMe);

// ==========================================
// 2. CHAT ROUTES (/api/v1/chat)
// ==========================================
export const chatRouter = Router();
chatRouter.use(authenticate);
// 1. Create or Get Chat: POST /api/v1/chat/create
chatRouter.post('/create', validate(createChatSchema), ChatController.createOrGetChat);
// 2. Send Message: POST /api/v1/chat/:chatId/message/send
chatRouter.post('/:chatId/message/send', validate(sendMessageSchema), MessageController.sendMessage);
// 3. Get Messages: GET /api/v1/chat/:chatId/messages
chatRouter.get('/:chatId/messages', validate(getMessagesSchema), MessageController.getMessages);
// 4. Mark Message Read: POST /api/v1/chat/:chatId/message/:messageId/read
chatRouter.post('/:chatId/message/:messageId/read', validate(markReadSchema), MessageController.markMessageRead);
// 5. Update Last Seen: POST /api/v1/chat/:chatId/lastseen
chatRouter.post('/:chatId/lastseen', validate(updateLastSeenSchema), MessageController.updateLastSeen);

// ==========================================
// 3. USER ROUTES (/api/v1/user)
// ==========================================
export const userRouter = Router();
userRouter.use(authenticate);
// 6. List User Chats: GET /api/v1/user/:userId/chats
userRouter.get('/:userId/chats', validate(userChatsParamSchema), ChatController.getUserChats);
userRouter.get('/me', getMe);

// Mount all modular paths under root v1 router
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/user', userRouter);

export default router;
