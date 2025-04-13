import type { Document, Types } from "mongoose";
import type { ChatParticipant } from "./chat.type";
export interface AttachmentType {
    url: string;
    localPath: string;
    name: string;
    type: string;
}
export declare enum StatusEnum {
    "sent" = 0,
    "delivered" = 1,
    "read" = 2
}
export interface ReactionType {
    userId: string;
    emoji: string;
    timestamp: Date;
}
export interface MessageType extends Document {
    _id: Types.ObjectId;
    sender: string;
    receivers: ChatParticipant[];
    chatId: Types.ObjectId;
    content: string;
    attachments: AttachmentType[];
    status: StatusEnum;
    reactions: ReactionType[];
    edited: {
        isEdited: boolean;
        editedAt: Date;
        previousContent: string[];
    };
    isDeleted: boolean;
    replyTo: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
