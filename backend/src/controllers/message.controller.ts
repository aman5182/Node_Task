import { Response } from 'express';
import { MessageService } from '../services/message.service';
import { asyncHandler, sendCreated, sendSuccess } from '../helpers';
import { AuthRequest } from '../types';

export class MessageController {
  /**
   * 2. SEND MESSAGE
   * POST /api/v1/chat/:chatId/message/send
   */
  static sendMessage = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { chatId } = req.params;
      const { text } = req.body;

      const message = await MessageService.sendMessage(
        chatId,
        authenticatedUserId,
        text
      );

      sendCreated(res, 'Message sent successfully', message);
    }
  );

  /**
   * 3. GET MESSAGES
   * GET /api/v1/chat/:chatId/messages
   */
  static getMessages = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { chatId } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const cursor = req.query.cursor as string | undefined;

      const result = await MessageService.getMessages(
        chatId,
        authenticatedUserId,
        limit,
        cursor
      );

      sendSuccess(res, 'Messages retrieved successfully', result);
    }
  );

  /**
   * 4. MARK MESSAGE READ
   * POST /api/v1/chat/:chatId/message/:messageId/read
   */
  static markMessageRead = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { chatId, messageId } = req.params;
      const { userId } = req.body;

      const readReceipt = await MessageService.markMessageRead(
        chatId,
        authenticatedUserId,
        messageId,
        userId
      );

      sendSuccess(res, 'Message marked as read', readReceipt);
    }
  );

  /**
   * 5. UPDATE LAST SEEN
   * POST /api/v1/chat/:chatId/lastseen
   */
  static updateLastSeen = asyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const authenticatedUserId = req.user!.userId;
      const { chatId } = req.params;
      const { userId, messageId } = req.body;

      const lastSeenRecord = await MessageService.updateLastSeen(
        chatId,
        authenticatedUserId,
        userId,
        messageId
      );

      sendSuccess(res, 'Last seen updated successfully', lastSeenRecord);
    }
  );
}
