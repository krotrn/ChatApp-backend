# Chat Service API Documentation

## Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [WebSocket Events](#websocket-events)
  - [Connection Events](#connection-events)
  - [Message Events](#message-events)
  - [Chat Events](#chat-events)
  - [Typing Indicators](#typing-indicators)
  - [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Chat Management](#chat-management)
    - [Get All Chats](#get-all-chats)
    - [Create or Get One-on-One Chat](#create-or-get-one-on-one-chat)
    - [Get Chat by ID](#get-chat-by-id)
    - [Delete One-on-One Chat](#delete-one-on-one-chat)
    - [Delete Chat For Me](#delete-chat-for-me)
  - [Group Chat Management](#group-chat-management)
    - [Create Group Chat](#create-group-chat)
    - [Get Group Chat Details](#get-group-chat-details)
    - [Rename Group Chat](#rename-group-chat)
    - [Delete Group Chat](#delete-group-chat)
    - [Add Participant to Group](#add-participant-to-group)
    - [Remove Participant from Group](#remove-participant-from-group)
    - [Leave Group Chat](#leave-group-chat)
  - [Message Management](#message-management)
    - [Get All Messages](#get-all-messages)
    - [Send Message](#send-message)
    - [Delete Message](#delete-message)
    - [Reply to Message](#reply-to-message)
    - [Update Message Reaction](#update-message-reaction)
  - [Message Pin Management](#message-pin-management)
    - [Pin Message](#pin-message)
    - [Unpin Message](#unpin-message)
  - [User Update Webhook](#user-update-webhook)
    - [User Update Webhook](#user-update-webhook-1)
- [Error Responses](#error-responses)
  - [400 Bad Request](#400-bad-request)
  - [401 Unauthorized](#401-unauthorized)
  - [403 Forbidden](#403-forbidden)
  - [404 Not Found](#404-not-found)
  - [500 Internal Server Error](#500-internal-server-error)

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All endpoints require authentication using a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## WebSocket Events

### Connection Events
- `connected`: Emitted when a user connects to the socket
- `disconnect`: Emitted when a user disconnects
- `online`: Emitted when a user comes online

### Message Events
- `messageReceived`: Emitted when a new message is received
- `messageDeleted`: Emitted when a message is deleted
- `messageReaction`: Emitted when a message reaction is updated
- `messagePin`: Emitted when a message is pinned/unpinned

### Chat Events
- `newChat`: Emitted when a new chat is created
- `chatDeleted`: Emitted when a chat is deleted
- `leaveChat`: Emitted when a user leaves a group chat
- `updateGroupName`: Emitted when a group chat name is updated

### Typing Indicators
- `typing`: Emitted when a user starts typing
- `stopTyping`: Emitted when a user stops typing

### Error Handling
- `socketError`: Emitted when a socket error occurs

## Endpoints

### Chat Management

#### Get All Chats
```http
GET /chats
```

Response:
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "chat_id",
      "name": "Chat Name",
      "type": "direct|group",
      "participants": [
        {
          "userId": "user_id",
          "name": "User Name",
          "avatarUrl": "avatar_url"
        }
      ],
      "admin": "admin_user_id",
      "createdBy": "creator_user_id",
      "lastMessage": {
        "_id": "message_id",
        "content": "Last message content",
        "sender": "sender_id",
        "createdAt": "2024-02-20T12:00:00Z"
      }
    }
  ],
  "message": "User chats fetched successfully!",
  "success": true
}
```

#### Create or Get One-on-One Chat
```http
POST /chats/chat
```

Request:
```json
{
  "participants": [
    {
      "userId": "user_id",
      "name": "User Name",
      "avatarUrl": "avatar_url"
    }
  ],
  "name": "Chat Name"
}
```

Response:
```json
{
  "statusCode": 201,
  "data": {
    "_id": "chat_id",
    "name": "Chat Name",
    "type": "direct",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": null
  },
  "message": "Chat retrieved successfully",
  "success": true
}
```

#### Get Chat by ID
```http
GET /chats/chat/:chatId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Chat Name",
    "type": "direct|group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Chat retrieved successfully",
  "success": true
}
```

#### Delete One-on-One Chat
```http
DELETE /chats/chat/:chatId
```

Response:
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Chat deleted successfully",
  "success": true
}
```

#### Delete Chat For Me
```http
DELETE /chats/chat/:chatId/delete-for-me
```

Response:
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Chat deleted for you successfully",
  "success": true
}
```

### Group Chat Management

#### Create Group Chat
```http
POST /chats/group
```

Request:
```json
{
  "name": "Group Name",
  "participants": [
    {
      "userId": "user_id",
      "name": "User Name",
      "avatarUrl": "avatar_url"
    }
  ]
}
```

Response:
```json
{
  "statusCode": 201,
  "data": {
    "_id": "chat_id",
    "name": "Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": null
  },
  "message": "Group chat created successfully",
  "success": true
}
```

#### Get Group Chat Details
```http
GET /chats/group/:chatId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Group chat details retrieved successfully",
  "success": true
}
```

#### Rename Group Chat
```http
PATCH /chats/group/:chatId
```

Request:
```json
{
  "name": "New Group Name"
}
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "New Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Group chat renamed successfully",
  "success": true
}
```

#### Delete Group Chat
```http
DELETE /chats/group/:chatId
```

Response:
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Group chat deleted successfully",
  "success": true
}
```

#### Add Participant to Group
```http
POST /chats/group/:chatId/participant/:participantId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Participant added successfully",
  "success": true
}
```

#### Remove Participant from Group
```http
DELETE /chats/group/:chatId/participant/:participantId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Participant removed successfully",
  "success": true
}
```

#### Leave Group Chat
```http
DELETE /chats/group/:chatId/leave
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Group Name",
    "type": "group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...}
  },
  "message": "Left group successfully",
  "success": true
}
```

### Message Management

#### Get All Messages
```http
GET /messages/:chatId
```

Response:
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "message_id",
      "content": "Message content",
      "sender": "sender_id",
      "receivers": [
        {
          "userId": "user_id",
          "name": "User Name",
          "avatarUrl": "avatar_url"
        }
      ],
      "chatId": "chat_id",
      "attachments": [
        {
          "name": "file_name",
          "url": "file_url",
          "type": "file_type"
        }
      ],
      "replyTo": "reply_to_message_id",
      "reactions": [
        {
          "userId": "user_id",
          "emoji": "👍",
          "timestamp": "2024-02-20T12:00:00Z"
        }
      ],
      "createdAt": "2024-02-20T12:00:00Z",
      "updatedAt": "2024-02-20T12:00:00Z"
    }
  ],
  "message": "Messages retrieved successfully",
  "success": true
}
```

#### Send Message
```http
POST /messages/:chatId
```

Request:
```json
{
  "content": "Message content"
}
```

For attachments, use multipart/form-data:
```
attachments: [file1, file2, ...]
```

Response:
```json
{
  "statusCode": 201,
  "data": {
    "_id": "message_id",
    "content": "Message content",
    "sender": "sender_id",
    "receivers": [...],
    "chatId": "chat_id",
    "attachments": [...],
    "replyTo": null,
    "reactions": [],
    "createdAt": "2024-02-20T12:00:00Z",
    "updatedAt": "2024-02-20T12:00:00Z"
  },
  "message": "Message sent successfully",
  "success": true
}
```

#### Delete Message
```http
DELETE /messages/:chatId/:messageId
```

Response:
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Message deleted successfully",
  "success": true
}
```

#### Reply to Message
```http
POST /messages/:chatId/:messageId/reply
```

Request:
```json
{
  "content": "Reply content"
}
```

Response:
```json
{
  "statusCode": 201,
  "data": {
    "_id": "message_id",
    "content": "Reply content",
    "sender": "sender_id",
    "receivers": [...],
    "chatId": "chat_id",
    "attachments": [],
    "replyTo": "original_message_id",
    "reactions": [],
    "createdAt": "2024-02-20T12:00:00Z",
    "updatedAt": "2024-02-20T12:00:00Z"
  },
  "message": "Reply sent successfully",
  "success": true
}
```

#### Update Message Reaction
```http
POST /messages/:chatId/:messageId/reaction
```

Request:
```json
{
  "emoji": "👍"
}
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "message_id",
    "content": "Message content",
    "sender": "sender_id",
    "receivers": [...],
    "chatId": "chat_id",
    "attachments": [...],
    "replyTo": null,
    "reactions": [
      {
        "userId": "user_id",
        "emoji": "👍",
        "timestamp": "2024-02-20T12:00:00Z"
      }
    ],
    "createdAt": "2024-02-20T12:00:00Z",
    "updatedAt": "2024-02-20T12:00:00Z"
  },
  "message": "Reaction updated successfully",
  "success": true
}
```

### Message Pin Management

#### Pin Message
```http
POST /chats/chat/:chatId/pin/:messageId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Chat Name",
    "type": "direct|group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...},
    "metadata": {
      "pinnedMessage": ["message_id"]
    }
  },
  "message": "Message pinned successfully",
  "success": true
}
```

#### Unpin Message
```http
DELETE /chats/chat/:chatId/pin/:messageId
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "_id": "chat_id",
    "name": "Chat Name",
    "type": "direct|group",
    "participants": [...],
    "admin": "admin_user_id",
    "createdBy": "creator_user_id",
    "lastMessage": {...},
    "metadata": {
      "pinnedMessage": []
    }
  },
  "message": "Message unpinned successfully",
  "success": true
}
```

### User Update Webhook

#### User Update Webhook
```http
POST /webhook/user
```

Request:
```json
{
  "userId": "user_id",
  "action": "update|delete",
  "data": {
    "name": "Updated Name",
    "avatarUrl": "updated_avatar_url"
  }
}
```

Response:
```json
{
  "message": "User update processed"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error message",
  "success": false,
  "errors": []
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "data": null,
  "message": "Unauthorized access",
  "success": false,
  "errors": []
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "data": null,
  "message": "Forbidden access",
  "success": false,
  "errors": []
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "data": null,
  "message": "Resource not found",
  "success": false,
  "errors": []
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "data": null,
  "message": "Internal server error",
  "success": false,
  "errors": []
}
```