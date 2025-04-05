import mongoose from "mongoose";

export interface ChatParticipant {
  userId: string;
  name: string;
  avatarUrl: string;
  role: "member" | "admin";
  joinedAt: Date;
}

export interface ChatType extends mongoose.Document {
  name: string;
  lastMessage?: mongoose.Types.ObjectId;
  participants: ChatParticipant[];
  avatar: string | "";
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
  deletedFor: [{ user: string; deletedAt: Date }];
  metadata?: {
    pinnedMessage: mongoose.Types.ObjectId[];
    customePermissions?: unknown;
  };
}

export interface DeletedForEntry {
  userId: string;
  deletedAt: Date;
}