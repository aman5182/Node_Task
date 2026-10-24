import { Request } from 'express';
import { Types } from 'mongoose';

// User Interface
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  isOnline: boolean;
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<IUser, 'password'>;

// Chat Interface (MongoDB metadata only - NO message text stored here)
export interface IChat {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  participantKey: string;
  type: 'direct';
  lastMessageId?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Firestore Message Interface (chats/{chatId}/messages/{messageId})
export interface IFirestoreMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string | Date;
}

// Firestore Read Receipt Interface (chats/{chatId}/messages/{messageId}/readReceipts/{userId})
export interface IReadReceipt {
  userId: string;
  readAt: string | Date;
}

// Firestore Last Seen Interface (chats/{chatId}/lastSeen/{userId})
export interface ILastSeen {
  userId: string;
  lastSeenMessageId: string;
  lastSeenAt: string | Date;
}

// Auth Request Interface
export interface AuthUserPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload;
}

// Standard API Response Envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: unknown[];
}
