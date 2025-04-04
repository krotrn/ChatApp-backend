
export const UserRolesEnum: { ADMIN: "ADMIN"; USER: "USER"; } = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

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
  DELETE_CHAT_EVENT: "chatDeleted",
  MESSAGE_PIN_EVENT: "messagePin",
  MESSAGE_REACTION_EVENT: "messageReaction"
});

export const AvailableChatEvents = Object.values(ChatEventEnum);