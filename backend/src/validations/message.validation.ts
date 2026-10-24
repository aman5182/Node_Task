import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const sendMessageSchema = z.object({
  params: z.object({
    chatId: z
      .string()
      .regex(objectIdRegex, 'chatId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
  body: z.object({
    text: z
      .string()
      .trim()
      .min(1, 'Message text cannot be empty')
      .max(5000, 'Message text cannot exceed 5000 characters'),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    chatId: z
      .string()
      .regex(objectIdRegex, 'chatId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return 50;
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 1) return 50;
        return Math.min(parsed, 100);
      }),
    cursor: z.string().optional(),
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    chatId: z
      .string()
      .regex(objectIdRegex, 'chatId must be a valid 24-character hexadecimal MongoDB ObjectId'),
    messageId: z.string().min(1, 'messageId is required'),
  }),
  body: z.object({
    userId: z
      .string()
      .regex(objectIdRegex, 'userId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
});

export const updateLastSeenSchema = z.object({
  params: z.object({
    chatId: z
      .string()
      .regex(objectIdRegex, 'chatId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
  body: z.object({
    userId: z
      .string()
      .regex(objectIdRegex, 'userId must be a valid 24-character hexadecimal MongoDB ObjectId'),
    messageId: z.string().min(1, 'messageId is required'),
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>['body'];
export type MarkReadInput = z.infer<typeof markReadSchema>['body'];
export type UpdateLastSeenInput = z.infer<typeof updateLastSeenSchema>['body'];
