import mongoose from 'mongoose';

export interface ChatParticipant {
  userId: string;
  role: "member" | "admin";
  joinedAt: Date;
}

export interface ChatType extends mongoose.Document {
  name: string;
  lastMessage?: mongoose.Types.ObjectId;
  participants: ChatParticipant[];
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
  deletedFor: [{ user: string, deletedAt: Date; }];
  metadata?: {
    pinnedMessage: mongoose.Types.ObjectId[],
    customePermissions?: unknown
  }
}