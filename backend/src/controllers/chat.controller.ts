import { Response } from 'express';
import { ChatService } from '../services/chat.service';
import { asyncHandler, sendSuccess } from '../helpers';
import { AuthRequest } from '../types';

export class ChatController {
  /**
   * 1. CREATE OR GET CHAT
   * POST /api/v1/chat/create
   */
  static createOrGetChat = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { userAId, userBId } = req.body;

      const chat = await ChatService.createOrGetChat(
        authenticatedUserId,
        userAId,
        userBId
      );

      sendSuccess(res, 'Chat retrieved or created successfully', chat);
    }
  );

  /**
   * 6. LIST USER CHATS
   * GET /api/v1/user/:userId/chats
   */
  static getUserChats = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { userId } = req.params;

      const chats = await ChatService.getUserChats(authenticatedUserId, userId);

      sendSuccess(res, 'User chats retrieved successfully', chats);
    }
  );
}
