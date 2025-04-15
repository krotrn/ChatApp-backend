export declare const UserRolesEnum: {
    ADMIN: "ADMIN";
    USER: "USER";
};
export declare const AvailableUserRoles: ("ADMIN" | "USER")[];
export declare const ChatEventEnum: Readonly<{
    CONNECTED_EVENT: "connected";
    DISCONNECT_EVENT: "disconnect";
    ONLINE_EVENT: "online";
    LEAVE_GROUP_EVENT: "leaveChat";
    UPDATE_GROUP_NAME_EVENT: "updateGroupName";
    MESSAGE_RECEIVED_EVENT: "messageReceived";
    NEW_CHAT_EVENT: "newChat";
    SOCKET_ERROR_EVENT: "socketError";
    STOP_TYPING_EVENT: "stopTyping";
    TYPING_EVENT: "typing";
    MESSAGE_DELETE_EVENT: "messageDeleted";
    DELETE_CHAT_EVENT: "chatDeleted";
    MESSAGE_PIN_EVENT: "messagePin";
    MESSAGE_REACTION_EVENT: "messageReaction";
    NEW_PARTICIPANT_ADDED_EVENT: "newParticipantAdded";
    PARTICIPANT_LEFT_EVENT: "participantLeft";
    MESSAGE_EDITED_EVENT: "messageEdited";
    MESSAGE_READ_EVENT: "messageRead";
}>;
export declare const AvailableChatEvents: ("connected" | "disconnect" | "online" | "leaveChat" | "updateGroupName" | "messageReceived" | "newChat" | "socketError" | "stopTyping" | "typing" | "messageDeleted" | "chatDeleted" | "messagePin" | "messageReaction" | "newParticipantAdded" | "participantLeft" | "messageEdited" | "messageRead")[];
