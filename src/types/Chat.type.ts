import mongoose from 'mongoose';
export interface ChatType extends mongoose.Document {
  name: string;
  lastMessage?: mongoose.Types.ObjectId;
  participants: string[];
  admin?: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
  deletedFor?: [{ user: string, deletedAt: Date; }];
  metadata?: {
    pinnedMessage: mongoose.Types.ObjectId[],
    customePermissions?: unknown
  }
}