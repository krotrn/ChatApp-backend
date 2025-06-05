import ApiError from "../utils/ApiError";
import pgClient from "../database/pgClient";
import { Chat } from "../models/chat.models";

export const validateUser = async (
  userIds: string[],
): Promise<{ id: string; name: string; avatarUrl: string | null }[]> => {
  if (!userIds.length) {
    console.warn("No user IDs provided for validation.");
    return [];
  }

  try {
    if (!pgClient) {
      throw new ApiError(503, "PostgreSQL client is not available.");
    }

    const query = {
      text: 'SELECT id, COALESCE(name, username) AS name, "avatarUrl" FROM "User" WHERE id = ANY($1::text[])',
      values: [userIds],
    };

    const {
      rows,
    }: {
      rows: { id: string; name: string; avatarUrl: string | null }[];
    } = await pgClient.query(query);
    return rows.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
    }));
  } catch (error) {
    console.error("Error during direct DB user validation:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      "User validation via direct DB query failed. Please try again later.",
    );
  }
};

export const validateChatParticipant = async (
  chatId: string,
  userId: string,
): Promise<boolean> => {
  try {
    if (!chatId || !userId) {
      console.warn("ChatId or UserId not provided for chat validation.");
      return false;
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.warn(`Chat with ID ${chatId} not found.`);
      return false;
    }

    // Check if user is a participant in the chat
    const isParticipant = chat.participants.some(
      (participant: { userId: string }) => participant.userId === userId,
    );

    return isParticipant;
  } catch (error) {
    console.error("Error during chat participant validation:", error);
    return false;
  }
};
