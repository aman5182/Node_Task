import { Schema, model, Document } from 'mongoose';
import { IChat } from '../types';

export interface IChatDocument extends Omit<IChat, '_id'>, Document {}

const chatSchema = new Schema<IChatDocument>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    participantKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['direct'],
      default: 'direct',
      required: true,
    },
    lastMessageId: {
      type: String,
    },
    lastMessageSenderId: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.chatId = ret._id;
        return ret;
      },
    },
  }
);

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

export const Chat = model<IChatDocument>('Chat', chatSchema);
