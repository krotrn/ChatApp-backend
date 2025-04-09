import ApiError from "./ApiError";
import type { ChatParticipant } from "../types/chat";
export const validateMessageContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  const trimmedContent = content.trim();
  return trimmedContent.length > 0 && trimmedContent.length <= 1000;
};

export const validateChatName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const trimmedName = name.trim();
  return trimmedName.length > 0 && trimmedName.length <= 50;
};

export const validateParticipantCount = (participants: ChatParticipant[]): boolean => {
  return participants.length >= 2 && participants.length <= 100;
};

export const validateFileSize = (file: Express.Multer.File): boolean => {
  const maxSize = 5 * 1024 * 1024;
  return file.size <= maxSize;
};

export const validateFileType = (file: Express.Multer.File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];
  return allowedTypes.includes(file.mimetype);
};

export const validateMessageInput = (content: string, files?: Express.Multer.File[]): void => {
  if (!content && (!files || files.length === 0)) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  if (content && !validateMessageContent(content)) {
    throw new ApiError(400, "Message content must be between 1 and 1000 characters");
  }

  if (files) {
    for (const file of files) {
      if (!validateFileSize(file)) {
        throw new ApiError(400, "File size must be less than 5MB");
      }
      if (!validateFileType(file)) {
        throw new ApiError(400, "Invalid file type");
      }
    }
  }
}; 