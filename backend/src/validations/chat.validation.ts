import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createChatSchema = z.object({
  body: z
    .object({
      userAId: z
        .string()
        .regex(objectIdRegex, 'userAId must be a valid 24-character hexadecimal MongoDB ObjectId'),
      userBId: z
        .string()
        .regex(objectIdRegex, 'userBId must be a valid 24-character hexadecimal MongoDB ObjectId'),
    })
    .refine((data) => data.userAId !== data.userBId, {
      message: 'Self-chat is not allowed. userAId and userBId must be different.',
      path: ['userBId'],
    }),
});

export const chatIdParamSchema = z.object({
  params: z.object({
    chatId: z
      .string()
      .regex(objectIdRegex, 'chatId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
});

export const userChatsParamSchema = z.object({
  params: z.object({
    userId: z
      .string()
      .regex(objectIdRegex, 'userId must be a valid 24-character hexadecimal MongoDB ObjectId'),
  }),
});

export type CreateChatInput = z.infer<typeof createChatSchema>['body'];
