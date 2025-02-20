
import mongoose, { Schema } from "mongoose";
import { StatusEnum } from "../types/chat.types";
import { ChatType } from "../types/chat.types";

const chatMessageSchema = new Schema<ChatType>(
  {
    sender: {
      type: String,
      required: true,
      index: true,
    },
    receiver: {
      type: String,
      required: true,
      index: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
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
          url: String,
          localPath: String,
        },
      ],
      default: [],
    status: {
      type: String,
      enum: Object.values(StatusEnum),
      default: StatusEnum.sent,
    },
    },
    reactions: [
      {
        userId: String,
        emoji: String,
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
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ chat: 1, createdAt: -1 });

export const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);
