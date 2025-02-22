
import mongoose, { Model, Schema } from "mongoose";
import { MessageType, StatusEnum } from "../types/Message.type";


const chatMessageSchema = new Schema<MessageType>(
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
      }
    ],
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

export const ChatMessage:Model<MessageType> =
  mongoose.models.ChatMessage ||
  mongoose.model<MessageType>("ChatMessage", chatMessageSchema);
