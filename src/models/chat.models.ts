import mongoose, { Model, Schema } from "mongoose";
import { ChatType } from "../types/Chat.type";

const chatSchema = new Schema<ChatType>(
  {
    name: {
      type: String,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    participants: [
      {
        userId: { type: String, required: true },
        role: { type: String, enum: ["member", "admin"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    admin: {
      type: String,
    },
    type: {
      type: String,
      enum: ["direct", "group", "channel"],
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    deletedFor: {
      type: [
        {
          user: String,
          deletedAt: Date,
        },
      ],
      default: [],
    },
    metadata: {
      pinnedMessage: [
        {
          type: Schema.Types.ObjectId,
          ref: "ChatMessage",
        },
      ],
      customePermissions: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ participants: 1, updatedAt: -1 });

export const Chat: Model<ChatType> =
  mongoose.models.Chat || mongoose.model<ChatType>("Chat", chatSchema);
