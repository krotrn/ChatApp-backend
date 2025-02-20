/**
 * @type {{ ADMIN: "ADMIN"; USER: "USER"} as const}
 */
export const UserRolesEnum: { ADMIN: "ADMIN"; USER: "USER"; } = {
  ADMIN: "ADMIN",
  USER: "USER",
};

export const AvailableUserRoles = Object.values(UserRolesEnum);

/**
 * Enum for chat events used in the application.
 * 
 * @enum {string}
 * @readonly
 * @property {string} CONNECTED_EVENT - Event for when a user connects.
 * @property {string} DISCONNECT_EVENT - Event for when a user disconnects.
 * @property {string} JOIN_CHAT_EVENT - Event for when a user joins a chat.
 * @property {string} LEAVE_CHAT_EVENT - Event for when a user leaves a chat.
 * @property {string} UPDATE_GROUP_NAME_EVENT - Event for when a group name is updated.
 * @property {string} MESSAGE_RECEIVED_EVENT - Event for when a message is received.
 * @property {string} NEW_CHAT_EVENT - Event for when a new chat is created.
 * @property {string} SOCKET_ERROR_EVENT - Event for when there is a socket error.
 * @property {string} STOP_TYPING_EVENT - Event for when a user stops typing.
 * @property {string} TYPING_EVENT - Event for when a user is typing.
 * @property {string} MESSAGE_DELETE_EVENT - Event for when a message is deleted.
 */
export const ChatEventEnum = Object.freeze({
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",
  JOIN_CHAT_EVENT: "joinChat",
  LEAVE_CHAT_EVENT: "leaveChat",
  UPDATE_GROUP_NAME_EVENT: "updateGroupName",
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  NEW_CHAT_EVENT: "newChat",
  SOCKET_ERROR_EVENT: "socketError",
  STOP_TYPING_EVENT: "stopTyping",
  TYPING_EVENT: "typing",
  MESSAGE_DELETE_EVENT: "messageDeleted",
});

export const AvailableChatEvents = Object.values(ChatEventEnum);