import { Document, Types } from "mongoose";

export interface AttachmentType {
  url: string;
  localPath: string;
}

export enum StatusEnum {
  "sent",
  "delivered",
  "read",
}

export interface ReactionType {
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageType extends Document {
  sender: string;
  receivers: string[];
  chatId: Types.ObjectId;
  content: string;
  attachments: AttachmentType[];
  status: StatusEnum;
  reactions: ReactionType[];
  edited: { isEdited: boolean; editedAt: Date; previousContent: string[]; };
  isDeleted: boolean;
  replyTo: Types.ObjectId;
}
