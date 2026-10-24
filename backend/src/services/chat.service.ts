import { Types } from 'mongoose';
import { Chat, IChatDocument } from '../models/Chat.model';
import { User } from '../models/User.model';
import { AppError } from '../helpers';

export interface ChatResponseDto {
  chatId: string;
  type: 'direct';
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ChatService {
  /**
   * Deterministic participant key to guarantee single direct chat per pair
   */
  public static generateParticipantKey(userAId: string, userBId: string): string {
    const sorted = [userAId, userBId].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  /**
   * 1. CREATE OR GET CHAT
   * Creates a direct 1-on-1 chat or returns the existing one.
   * Concurrency-safe using unique MongoDB index on participantKey.
   */
  static async createOrGetChat(
    authenticatedUserId: string,
    userAId: string,
    userBId: string
  ): Promise<ChatResponseDto> {
    // 1. Authenticated user must be one of the participants
    if (authenticatedUserId !== userAId && authenticatedUserId !== userBId) {
      throw new AppError(403, 'Forbidden: Authenticated user must be one of the participants');
    }

    // 2. Reject self-chat
    if (userAId === userBId) {
      throw new AppError(400, 'Self-chat is not allowed');
    }

    // 3. Ensure both users exist and are active
    const [userA, userB] = await Promise.all([
      User.findById(userAId),
      User.findById(userBId),
    ]);

    if (!userA || !userA.isActive) {
      throw new AppError(404, `User with ID '${userAId}' does not exist or is inactive`);
    }

    if (!userB || !userB.isActive) {
      throw new AppError(404, `User with ID '${userBId}' does not exist or is inactive`);
    }

    // 4. Deterministic participant key
    const participantKey = this.generateParticipantKey(userAId, userBId);

    // 5. Check if chat already exists
    let chat = await Chat.findOne({ participantKey });

    if (!chat) {
      try {
        chat = await Chat.create({
          participants: [new Types.ObjectId(userAId), new Types.ObjectId(userBId)],
          participantKey,
          type: 'direct',
        });
      } catch (error: unknown) {
        // Safe concurrency handling: If duplicate key error occurs due to race condition,
        // retrieve the existing chat created by the parallel request
        if ((error as { code?: number }).code === 11000) {
          chat = await Chat.findOne({ participantKey });
        } else {
          throw error;
        }
      }
    }

    if (!chat) {
      throw new AppError(500, 'Failed to create or retrieve chat');
    }

    return {
      chatId: chat._id.toString(),
      type: chat.type,
      participants: chat.participants.map((p) => p.toString()),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  /**
   * 6. LIST USER CHATS
   * Retrieves all chats for a user, sorted by recent activity (updatedAt: -1).
   */
  static async getUserChats(
    authenticatedUserId: string,
    targetUserId: string
  ): Promise<ChatResponseDto[]> {
    // Verify userId matches the authenticated user
    if (authenticatedUserId !== targetUserId) {
      throw new AppError(403, 'Forbidden: You can only retrieve your own chats');
    }

    const chats = await Chat.find({
      participants: new Types.ObjectId(targetUserId),
    }).sort({ updatedAt: -1 });

    return chats.map((chat) => ({
      chatId: chat._id.toString(),
      type: chat.type,
      participants: chat.participants.map((p) => p.toString()),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  }

  /**
   * Helper: Validates that chat exists and user is an active participant
   */
  static async validateChatMembership(chatId: string, userId: string): Promise<IChatDocument> {
    if (!Types.ObjectId.isValid(chatId)) {
      throw new AppError(400, 'Invalid chatId format');
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new AppError(404, 'Chat not found');
    }

    const isMember = chat.participants.some((p) => p.toString() === userId);
    if (!isMember) {
      throw new AppError(403, 'Forbidden: You are not a member of this chat');
    }

    return chat;
  }
}
