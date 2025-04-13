import type { Document, Types } from "mongoose";
import { DeletedForEntry } from "./chat";
export interface AttachmentType {
    name: string;
    url: string;
    localPath: string;
    status: StatusEnum;
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
export interface EditType {
    content: string;
    editedAt: Date;
    editedBy: string;
}
export interface ReadByType {
    userId: string;
    readAt: Date;
}
export interface User {
    userId: string;
    name: string;
    avatarUrl: string;
}
export interface MessageType extends Document {
    _id: Types.ObjectId;
    sender: User;
    receivers: User[];
    chatId: Types.ObjectId;
    content: string;
    attachments: AttachmentType[];
    status: StatusEnum;
    reactions: ReactionType[];
    edited: {
        isEdited: boolean;
        editedAt: Date;
    };
    edits: EditType[];
    readBy: ReadByType[];
    deletedFor: DeletedForEntry[];
    replyToId?: Types.ObjectId;
    formatting: Map<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
export interface MessageResponseType {
    _id: string;
    sender: User;
    receivers: User[];
    chatId: string;
    content: string;
    attachments: AttachmentType[];
    status: StatusEnum;
    reactions: ReactionType[];
    edited: {
        isEdited: boolean;
        editedAt: Date;
    };
    edits: EditType[];
    readBy: ReadByType[];
    deletedFor: DeletedForEntry[];
    replyToId: string | null;
    formatting: Map<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
