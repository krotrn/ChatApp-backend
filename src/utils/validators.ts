import ApiError from "./ApiError";
import type { ChatParticipant } from "../types/chat";
import { AttachmentType } from "../types/message";
export const validateMessageContent = (content: string): boolean => {
  if (!content || typeof content !== "string") {
    return false;
  }
  const trimmedContent = content.trim();
  return trimmedContent.length > 0 && trimmedContent.length <= 1000;
};

export const validateChatName = (name: string): boolean => {
  if (!name || typeof name !== "string") {
    return false;
  }
  const trimmedName = name.trim();
  return trimmedName.length > 0 && trimmedName.length <= 50;
};

export const validateParticipantCount = (
  participants: ChatParticipant[],
): boolean => {
  return participants.length >= 2 && participants.length <= 100;
};

export const validateMessageInput = (
  content: string,
  files?: AttachmentType[],
): void => {
  if (!content && (!files || files.length === 0)) {
    throw new ApiError(400, "Message content or attachment is required");
  }

  if (content && !validateMessageContent(content)) {
    throw new ApiError(
      400,
      "Message content must be between 1 and 1000 characters",
    );
  }
};
