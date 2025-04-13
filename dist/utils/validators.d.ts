import type { ChatParticipant } from "../types/chat";
export declare const validateMessageContent: (content: string) => boolean;
export declare const validateChatName: (name: string) => boolean;
export declare const validateParticipantCount: (participants: ChatParticipant[]) => boolean;
export declare const validateFileSize: (file: Express.Multer.File) => boolean;
export declare const validateFileType: (file: Express.Multer.File) => boolean;
export declare const validateMessageInput: (content: string, files?: Express.Multer.File[]) => void;
