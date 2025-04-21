import mongoose, { Schema } from "mongoose";

import { StatusEnum } from "../types/message";

const reactionSchema = new Schema({
  userId: String,
  emoji: String,
  timestamp: Date,
});

const editSchema = new Schema({
  content: String,
  editedAt: { type: Date, default: Date.now },
  editedBy: String,
});

const readBySchema = new Schema({
  userId: String,
  readAt: { type: Date, default: Date.now },
});

const deletedForSchema = new Schema({
  userId: String,
  deletedAt: { type: Date, default: Date.now },
});

const userSchema = new Schema({
  userId: String,
  name: String,
  avatarUrl: String,
});

const attachmentSchema = new Schema({
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
  deletedFor: {
    type: [deletedForSchema],
    default: [],
  },
});

const chatMessageSchema = new Schema(
  {
    sender: userSchema,

    receivers: {
      type: [userSchema],
      default: [],
    },

    chatId: {
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
      type: [attachmentSchema],
      default: [],
    },

    reactions: {
      type: [reactionSchema],
      default: [],
    },

    edited: {
      isEdited: { type: Boolean, default: false },
      editedAt: { type: Date, default: Date.now },
    },

    edits: {
      type: [editSchema],
      default: [],
    },

    readBy: {
      type: [readBySchema],
      default: [],
    },

    deletedFor: {
      type: [deletedForSchema],
      default: [],
    },

    replyToId: { type: Schema.Types.ObjectId, ref: "ChatMessage" },

    formatting: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({ chatId: 1, createdAt: -1 });

export const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);
