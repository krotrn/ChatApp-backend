export const UserRolesEnum: { ADMIN: "ADMIN"; USER: "USER" } = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export const ChatEventEnum = Object.freeze({
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",
  ONLINE_EVENT: "online",
  LEAVE_GROUP_EVENT: "leaveChat",
  UPDATE_GROUP_NAME_EVENT: "updateGroupName",
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  NEW_CHAT_EVENT: "newChat",
  SOCKET_ERROR_EVENT: "socketError",
  STOP_TYPING_EVENT: "stopTyping",
  TYPING_EVENT: "typing",
  MESSAGE_DELETE_EVENT: "messageDeleted",
  CHAT_DELETED_EVENT: "chatDeleted",
  MESSAGE_PINNED_EVENT: "messagePinned",
  MESSAGE_UNPINNED_EVENT: "messageUnpinned",
  CHAT_UPDATED_EVENT: "chatUpdated",
  REMOVED_FROM_CHAT: "removedFromChat",
  MESSAGE_REACTION_EVENT: "messageReaction",
  NEW_PARTICIPANT_ADDED_EVENT: "newParticipantAdded",
  PARTICIPANT_LEFT_EVENT: "participantLeft",
  MESSAGE_EDITED_EVENT: "messageEdited",
  MESSAGE_READ_EVENT: "messageRead",
});
