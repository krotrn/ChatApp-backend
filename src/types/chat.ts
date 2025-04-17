import type mongoose from "mongoose";
import type { User } from "./message";
import { MessageResponseType } from "./message";

export interface ChatParticipant extends User {
  role: "member" | "admin";
  joinedAt: Date;
}

export interface DeletedForEntry {
  userId: string;
  deletedAt: Date;
}

export interface ChatType extends mongoose.Document {
  name: string;
  lastMessage?: mongoose.Types.ObjectId;
  avatarUrl: string | "";
  participants: ChatParticipant[];
  admin: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
  deletedFor: DeletedForEntry[];
  metadata: {
    pinnedMessage: mongoose.Types.ObjectId[];
    customePermissions: mongoose.Schema.Types.Mixed;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponseType {
  _id: string;
  name: string;
  lastMessage: MessageResponseType | null;
  avatarUrl: string;
  participants: ChatParticipant[];
  admin: string;
  type: "direct" | "group" | "channel";
  createdBy: string;
  deletedFor: DeletedForEntry[];
  metadata?: {
    pinnedMessage: string[];
    customePermissions?: mongoose.Schema.Types.Mixed;
  };
  messages: MessageResponseType[];
  createdAt: Date;
  updatedAt: Date;
}
