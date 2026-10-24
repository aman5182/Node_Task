import { admin, getFirestore } from '../config/firebase';
import { Chat } from '../models/Chat.model';
import { ChatService } from './chat.service';
import { AppError } from '../helpers';
import { IFirestoreMessage, IReadReceipt, ILastSeen } from '../types';

export interface PaginatedMessagesResponse {
  messages: IFirestoreMessage[];
  nextCursor: string | null;
}

const parseFirestoreTimestamp = (timestamp: unknown): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return String(timestamp);
};

const getTimestampMillis = (timestamp: unknown): number => {
  if (!timestamp) return 0;
  if (typeof (timestamp as { toMillis?: () => number }).toMillis === 'function') {
    return (timestamp as { toMillis: () => number }).toMillis();
  }
  if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate().getTime();
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  return new Date(String(timestamp)).getTime();
};

export class MessageService {
  /**
   * 2. SEND MESSAGE
   * Persists message in Firestore under chats/{chatId}/messages/{messageId}
   * and updates MongoDB chat activity metadata with recoverable retry.
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    text: string
  ): Promise<IFirestoreMessage> {
    // 1. Verify authentication and chat membership
    await ChatService.validateChatMembership(chatId, senderId);

    const firestore = getFirestore();
    const messagesCollection = firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages');

    const now = new Date();
    const docRef = messagesCollection.doc();

    const messageData = {
      chatId,
      senderId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save message to Firestore
    await docRef.set(messageData);

    // Update MongoDB Chat activity metadata (lastMessageId, lastMessageSenderId, lastMessageAt)
    // NOTE: Rule strictly observed — NEVER store message content or read receipts in MongoDB.
    const updateMongoWithRetry = async (maxRetries = 2): Promise<void> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await Chat.findByIdAndUpdate(chatId, {
            lastMessageId: docRef.id,
            lastMessageSenderId: senderId,
            lastMessageAt: now,
            updatedAt: now,
          });
          return;
        } catch (err) {
          if (attempt === maxRetries) {
            console.warn(
              `[Partial Failure Handled] Failed to update MongoDB chat metadata after ${maxRetries} retries:`,
              err
            );
          }
        }
      }
    };

    await updateMongoWithRetry();

    return {
      id: docRef.id,
      chatId,
      senderId,
      text,
      createdAt: now.toISOString(),
    };
  }

  /**
   * 3. GET MESSAGES
   * Retrieves messages ordered newest first with cursor-based pagination.
   */
  static async getMessages(
    chatId: string,
    userId: string,
    limitCount: number = 50,
    cursor?: string
  ): Promise<PaginatedMessagesResponse> {
    // 1. Verify chat membership
    await ChatService.validateChatMembership(chatId, userId);

    const firestore = getFirestore();
    const messagesCollection = firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages');

    // 2. Validate cursor if provided
    let cursorDocSnap: FirebaseFirestore.DocumentSnapshot | undefined;
    if (cursor) {
      cursorDocSnap = await messagesCollection.doc(cursor).get();
      if (!cursorDocSnap.exists) {
        throw new AppError(
          400,
          `Invalid cursor: Message '${cursor}' does not exist in this chat`
        );
      }
    }

    // 3. Query ordered newest first (fetch limit + 1 to detect nextCursor)
    let query = messagesCollection
      .orderBy('createdAt', 'desc')
      .limit(limitCount + 1);

    if (cursorDocSnap) {
      query = query.startAfter(cursorDocSnap);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return { messages: [], nextCursor: null };
    }

    const docs = snapshot.docs;
    const hasMore = docs.length > limitCount;
    const resultDocs = hasMore ? docs.slice(0, limitCount) : docs;

    const messages: IFirestoreMessage[] = resultDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        chatId: data.chatId,
        senderId: data.senderId,
        text: data.text,
        createdAt: parseFirestoreTimestamp(data.createdAt),
      };
    });

    const nextCursor = hasMore ? resultDocs[resultDocs.length - 1].id : null;

    return {
      messages,
      nextCursor,
    };
  }

  /**
   * 4. MARK MESSAGE READ
   * Idempotent read receipts at chats/{chatId}/messages/{messageId}/readReceipts/{userId}
   * Preserves original readAt timestamp. Rejects sender's own message read receipts.
   */
  static async markMessageRead(
    chatId: string,
    authenticatedUserId: string,
    messageId: string,
    targetUserId: string
  ): Promise<IReadReceipt> {
    // 1. Verify userId matches the authenticated user
    if (authenticatedUserId !== targetUserId) {
      throw new AppError(
        403,
        'Forbidden: Request body userId must match authenticated user'
      );
    }

    // 2. Verify chat membership
    await ChatService.validateChatMembership(chatId, authenticatedUserId);

    const firestore = getFirestore();
    const messageDocRef = firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    // 3. Verify message existence
    const messageDoc = await messageDocRef.get();
    if (!messageDoc.exists) {
      throw new AppError(404, `Message '${messageId}' does not exist in this chat`);
    }

    // 4. Do not create read receipts for sender's own message
    const messageData = messageDoc.data()!;
    if (messageData.senderId === authenticatedUserId) {
      throw new AppError(
        400,
        'Sender cannot mark their own message as read'
      );
    }

    // 5. Check if read receipt already exists (Idempotency check)
    const receiptDocRef = messageDocRef.collection('readReceipts').doc(authenticatedUserId);
    const existingReceipt = await receiptDocRef.get();

    if (existingReceipt.exists) {
      const data = existingReceipt.data()!;
      return {
        userId: authenticatedUserId,
        readAt: parseFirestoreTimestamp(data.readAt),
      };
    }

    // 6. Record initial read receipt
    const now = new Date();
    await receiptDocRef.set({
      userId: authenticatedUserId,
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      userId: authenticatedUserId,
      readAt: now.toISOString(),
    };
  }

  /**
   * 5. UPDATE LAST SEEN
   * Stores at chats/{chatId}/lastSeen/{userId}
   * Enforces authoritative message ordering so last-seen NEVER moves backward.
   */
  static async updateLastSeen(
    chatId: string,
    authenticatedUserId: string,
    targetUserId: string,
    messageId: string
  ): Promise<ILastSeen> {
    // 1. Verify userId matches authenticated user
    if (authenticatedUserId !== targetUserId) {
      throw new AppError(
        403,
        'Forbidden: Request body userId must match authenticated user'
      );
    }

    // 2. Verify chat membership
    await ChatService.validateChatMembership(chatId, authenticatedUserId);

    const firestore = getFirestore();

    // 3. Verify message exists in this chat
    const targetMsgRef = firestore
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const targetMsgDoc = await targetMsgRef.get();
    if (!targetMsgDoc.exists) {
      throw new AppError(404, `Message '${messageId}' does not exist in this chat`);
    }

    const targetMsgData = targetMsgDoc.data()!;
    const targetMsgCreatedAtMillis = getTimestampMillis(targetMsgData.createdAt);

    // 4. Authoritative check: Fetch current last-seen record
    const lastSeenRef = firestore
      .collection('chats')
      .doc(chatId)
      .collection('lastSeen')
      .doc(authenticatedUserId);

    const currentLastSeenDoc = await lastSeenRef.get();

    if (currentLastSeenDoc.exists) {
      const currentLastSeenData = currentLastSeenDoc.data()!;
      const currentMsgId = currentLastSeenData.lastSeenMessageId;

      if (currentMsgId === messageId) {
        // Idempotent: same message already recorded
        return {
          userId: authenticatedUserId,
          lastSeenMessageId: messageId,
          lastSeenAt: parseFirestoreTimestamp(currentLastSeenData.lastSeenAt),
        };
      }

      // Fetch the previously seen message to compare chronological ordering
      const prevMsgDoc = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc(currentMsgId)
        .get();

      if (prevMsgDoc.exists) {
        const prevMsgData = prevMsgDoc.data()!;
        const prevMsgCreatedAtMillis = getTimestampMillis(prevMsgData.createdAt);

        // Disallow moving backward!
        if (targetMsgCreatedAtMillis < prevMsgCreatedAtMillis) {
          throw new AppError(
            400,
            'Cannot move last-seen backward to an earlier message'
          );
        }
      }
    }

    // 5. Update lastSeen
    const now = new Date();
    await lastSeenRef.set({
      userId: authenticatedUserId,
      lastSeenMessageId: messageId,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      userId: authenticatedUserId,
      lastSeenMessageId: messageId,
      lastSeenAt: now.toISOString(),
    };
  }
}
