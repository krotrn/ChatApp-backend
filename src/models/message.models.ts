import mongoose, { Schema } from 'mongoose';

import { StatusEnum } from '../types/message';

const chatMessageSchema = new Schema(
  {
    sender: {
      type: String,
      required: true,
      index: true,
    },
    receivers: [
      {
        type: String,
        required: true,
        index: true,
      },
    ],
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      index: true,
    },
    attachments: {
      type: [
        {
          name: {
            type: String,
            required: true,
          },
          url: String,
          localPath: String,
          status: {
            type: String,
            enum: Object.values(StatusEnum),
            default: StatusEnum.sent,
          },
          type: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    reactions: [
      {
        userId: String,
        emoji: String,
        timestamp: Date,
      },
    ],
    edited: {
      isEdited: { type: Boolean, default: false },
      editedAt: Date,
      PreviousContent: [String],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    replyToId: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ chatId: 1, createdAt: -1 });

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
