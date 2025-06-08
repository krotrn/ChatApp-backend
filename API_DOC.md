# Chat Backend API Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [Chat Endpoints](#chat-endpoints)
   - [Get All Chats](#1-get-all-chats)
   - [Create or Get One-on-One Chat](#2-create-or-get-one-on-one-chat)
   - [Get Chat by ID](#3-get-chat-by-id)
   - [Delete One-on-One Chat](#4-delete-one-on-one-chat)
   - [Delete Chat for Me](#5-delete-chat-for-me)
   - [Create Group Chat](#6-create-group-chat)
   - [Get Group Chat Details](#7-get-group-chat-details)
   - [Update Group Chat](#8-update-group-chat)
   - [Delete Group Chat](#9-delete-group-chat)
   - [Add Participant to Group Chat](#10-add-participant-to-group-chat)
   - [Remove Participant from Group Chat](#11-remove-participant-from-group-chat)
   - [Leave Group Chat](#12-leave-group-chat)
   - [Pin Message](#13-pin-message)
   - [Unpin Message](#14-unpin-message)
3. [Message Endpoints](#message-endpoints)
   - [Get All Messages](#1-get-all-messages)
   - [Send Message](#2-send-message)
   - [Delete Message](#3-delete-message)
   - [Delete Message for Me](#4-delete-message-for-me)
   - [Edit Message](#5-edit-message)
   - [Mark Messages as Read](#6-mark-messages-as-read)
   - [Update Message Reaction](#7-update-message-reaction)
4. [Webhook Endpoints](#webhook-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Response Types](#response-types)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Health Check](#health-check)
10. [Additional Notes](#additional-notes)

## Authentication

### Token-based Authentication

The API uses JSON Web Tokens (JWT) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

All endpoints require authentication unless stated otherwise.

## Chat Endpoints

### 1. Get All Chats

- **GET** `/api/v1/chats`
- **Description**: Get all chats for the authenticated user with pagination
- **Authentication**: Required
- **Parameters**:
  - `limit` (query, optional): Number of chats to retrieve (default: 10, max: 100)
  - `page` (query, optional): Page number for pagination (default: 1)

**Response**:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "string",
      "name": "string",
      "type": "direct" | "group" | "channel",
      "participants": [
        {
          "userId": "string",
          "name": "string",
          "avatarUrl": "string",
          "role": "member" | "admin",
          "joinedAt": "date"
        }
      ],
      "admin": "string",
      "createdBy": "string",
      "avatarUrl": "string",
      "lastMessage": {
        "_id": "string",
        "content": "string",
        "sender": { "userId": "string", "name": "string", "avatarUrl": "string" },
        "createdAt": "date"
      } | null,
      "metadata": {
        "pinnedMessage": ["messageId1", "messageId2"],
        "customePermissions": {}
      },
      "messages": [],
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

### 2. Create or Get One-on-One Chat

- **POST** `/api/v1/chats`
- **Description**: Create a new one-on-one chat or get existing one
- **Authentication**: Required
- **Rate Limit**: Chat creation rate limiter applied

**Request Body**:

```json
{
  "participantId": "string"
}
```

### 3. Get Chat by ID

- **GET** `/api/v1/chats/chat/:chatId`
- **Description**: Get a specific chat by its ID
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The chat ID

### 4. Delete One-on-One Chat

- **DELETE** `/api/v1/chats/chat/:chatId`
- **Description**: Delete a one-on-one chat completely
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The chat ID

### 5. Delete Chat for Me

- **DELETE** `/api/v1/chats/:chatId/me`
- **Description**: Delete chat for the current user only (soft delete)
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The chat ID

### 6. Create Group Chat

- **POST** `/api/v1/chats/group`
- **Description**: Create a new group chat
- **Authentication**: Required
- **Rate Limit**: Chat creation rate limiter applied

**Request Body**:

```json
{
  "name": "string",
  "participants": ["userId1", "userId2"],
  "avatarUrl": "string" (optional)
}
```

### 7. Get Group Chat Details

- **GET** `/api/v1/chats/group/:chatId`
- **Description**: Get detailed information about a group chat
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The group chat ID

### 8. Update Group Chat

- **PATCH** `/api/v1/chats/group/:chatId`
- **Description**: Update group chat details (name, avatar)
- **Authentication**: Required
- **Rate Limit**: Chat creation rate limiter applied
- **Parameters**:
  - `chatId` (path): The group chat ID

**Request Body**:

```json
{
  "name": "string" (optional),
  "avatarUrl": "string" (optional)
}
```

### 9. Delete Group Chat

- **DELETE** `/api/v1/chats/group/:chatId`
- **Description**: Delete a group chat (admin only)
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The group chat ID

### 10. Add Participant to Group Chat

- **POST** `/api/v1/chats/group/:chatId/participants`
- **Description**: Add a new participant to a group chat
- **Authentication**: Required
- **Rate Limit**: Chat creation rate limiter applied
- **Parameters**:
  - `chatId` (path): The group chat ID

**Request Body**:

```json
{
  "userId": "string"
}
```

### 11. Remove Participant from Group Chat

- **DELETE** `/api/v1/chats/group/:chatId/participants/:userId`
- **Description**: Remove a participant from a group chat (admin only)
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The group chat ID
  - `userId` (path): The user ID to remove

### 12. Leave Group Chat

- **DELETE** `/api/v1/chats/group/:chatId/leave`
- **Description**: Leave a group chat (self-removal)
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The group chat ID

### 13. Pin Message

- **POST** `/api/v1/chats/:chatId/pin/:messageId`
- **Description**: Pin a message in a chat
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID to pin

### 14. Unpin Message

- **DELETE** `/api/v1/chats/:chatId/pin/:messageId`
- **Description**: Unpin a message in a chat
- **Authentication**: Required
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID to unpin

## Message Endpoints

### 1. Get All Messages

- **GET** `/api/v1/messages/:chatId`
- **Description**: Get all messages in a chat with pagination
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID
  - `limit` (query, optional): Number of messages to retrieve
  - `page` (query, optional): Page number for pagination

**Response**:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "string",
      "sender": {
        "userId": "string",
        "name": "string",
        "avatarUrl": "string"
      },
      "receivers": [
        {
          "userId": "string",
          "name": "string",
          "avatarUrl": "string"
        }
      ],
      "chatId": "string",
      "content": "string",
      "attachments": [
        {
          "name": "string",
          "url": "string",
          "size": "string",
          "type": "string",
          "public_id": "string",
          "deletedFor": []
        }
      ],
      "status": 0 | 1 | 2 | 3,
      "reactions": [
        {
          "userId": "string",
          "emoji": "string",
          "timestamp": "date"
        }
      ],
      "isPinned": boolean,
      "edited": {
        "isEdited": boolean,
        "editedAt": "date"
      },
      "edits": [
        {
          "content": "string",
          "editedAt": "date",
          "editedBy": "string"
        }
      ],
      "readBy": [
        {
          "userId": "string",
          "readAt": "date"
        }
      ],
      "deletedFor": [],
      "replyToId": "string" | null,
      "formatting": {},
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

### 2. Send Message

- **POST** `/api/v1/messages/:chatId`
- **Description**: Send a new message to a chat
- **Authentication**: Required
- **Rate Limit**: Message rate limiter and file upload rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID

**Request Body**:

```json
{
  "content": "string",
  "attachments": [] (optional),
  "replyToId": "string" (optional),
  "formatting": {} (optional)
}
```

### 3. Delete Message

- **DELETE** `/api/v1/messages/:chatId/:messageId`
- **Description**: Delete a message for everyone (sender only)
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID

### 4. Delete Message for Me

- **DELETE** `/api/v1/messages/:chatId/:messageId/me`
- **Description**: Delete a message for the current user only
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID

### 5. Edit Message

- **PATCH** `/api/v1/messages/:chatId/:messageId/edit`
- **Description**: Edit an existing message (sender only)
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID

**Request Body**:

```json
{
  "content": "string",
  "replyToId": "string" (optional)
}
```

### 6. Mark Messages as Read

- **POST** `/api/v1/messages/:chatId/read`
- **Description**: Mark messages in a chat as read
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID

**Request Body**:

```json
{
  "messageIds": ["messageId1", "messageId2"] (optional)
}
```

### 7. Update Message Reaction

- **PATCH** `/api/v1/messages/:chatId/:messageId/reaction`
- **Description**: Add or remove a reaction to/from a message (toggles existing reactions)
- **Authentication**: Required
- **Rate Limit**: Message rate limiter applied
- **Parameters**:
  - `chatId` (path): The chat ID
  - `messageId` (path): The message ID

**Request Body**:

```json
{
  "emoji": "string"
}
```

**Note**: The API automatically toggles reactions - if the user has already reacted with the same emoji, it removes the reaction; otherwise, it adds the reaction.

## Webhook Endpoints

### 1. User Update Webhook

- **POST** `/api/v1/webhook/user`
- **Description**: Handle user updates from external systems (used for synchronizing user data)
- **Authentication**: Required

**Request Body**:

```json
{
  "userId": "string",
  "action": "update" | "delete",
  "data": {
    "name": "string" (optional),
    "avatarUrl": "string" (optional)
  }
}
```

**Response**:

```json
{
  "statusCode": 200,
  "message": "User update processed",
  "success": true
}
```

### 2. Update User Webhook Settings

- **PUT** `/api/v1/webhook/user`
- **Description**: Update webhook settings for the user
- **Authentication**: Required

**Request Body**:

```json
{
  "webhookUrl": "string",
  "events": ["messageReceived", "chatCreated"],
  "isActive": boolean
}
```

### 3. Delete User Webhook Settings

- **DELETE** `/api/v1/webhook/user`
- **Description**: Delete webhook settings for the user
- **Authentication**: Required

## WebSocket Events

The API supports real-time communication through WebSocket connections using Socket.IO with authentication middleware.

### Connection Configuration

- **Ping Timeout**: 30 seconds
- **Ping Interval**: 10 seconds
- **Authentication**: Required for all socket connections

### Connection Events

- `connected` - Emitted by server to client on successful connection
- `disconnect` - Standard socket.io disconnect event
- `socketError` - Emitted by server on socket-related errors

### Online Status Events

- `userOnline` - Emitted by client when it comes online
- `userOffline` - Emitted by client when it goes offline explicitly
- `userIsOnline` - Emitted by server to notify clients that a user is online
- `userIsOffline` - Emitted by server to notify clients that a user is offline
- `onlineUserIdsList` - Emitted by server to send complete list of online users

### Chat Room Events

- `joinChat` - Client requests to join a specific chat room
- `leaveChat` - Client requests to leave a specific chat room
- `newParticipantAdded` - Broadcast when a participant is added to a chat
- `participantLeft` - Broadcast when a participant leaves a chat

### Messaging & Interaction Events

- `messageReceived` - New message received in a chat
- `typing` - User is typing in a chat
- `stopTyping` - User stopped typing in a chat
- `messageDeleted` - Message was deleted
- `messagePinned` - Message was pinned
- `messageUnpinned` - Message was unpinned
- `messageReaction` - Message reaction added/removed
- `messageEdited` - Message was edited
- `messageRead` - Message read receipt (if implemented)

### Chat Meta Events

- `newChat` - A new chat is created
- `chatDeleted` - A chat is deleted
- `chatUpdated` - Chat details (e.g., name, image) updated
- `removedFromChat` - User removed from a chat by another user
- `updateGroupName` - Specific event for group name change

## Response Types

### Standard API Response Format

All API responses follow this format:

```json
{
  "statusCode": number,
  "data": any,
  "message": "string",
  "success": boolean
}
```

### Chat Participant Type

```json
{
  "userId": "string",
  "name": "string",
  "avatarUrl": "string",
  "role": "member" | "admin",
  "joinedAt": "date"
}
```

### Message Status Enum

- `0` - SENT
- `1` - DELIVERED
- `2` - READ
- `3` - FAILED

### Chat Types

- `direct` - One-on-one chat between two users
- `group` - Group chat with multiple participants
- `channel` - Channel type (reserved for future use)

### Deleted For Entry

```json
{
  "userId": "string",
  "deletedAt": "date"
}
```

## Error Handling

### Error Response Format

```json
{
  "statusCode": number,
  "message": "Error description",
  "success": false,
  "errors": [] (for validation errors)
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

### Validation Errors

Validation errors include detailed information about which fields failed validation:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "success": false,
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Rate Limiting

The API implements several layers of rate limiting:

### General Rate Limiting

- **Limit**: 5000 requests per 15 minutes per IP address
- **Applied to**: All API endpoints
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

### Specific Rate Limiters

1. **Chat Creation Rate Limiter**

   - Applied to: Chat creation, group management, participant operations
   - Endpoints: `POST /chats`, `POST /chats/group`, `PATCH /chats/group/:id`, etc.

2. **Message Rate Limiter**

   - Applied to: All message operations
   - Endpoints: All `/messages/*` endpoints

3. **File Upload Rate Limiter**
   - Applied to: File upload operations
   - Endpoints: `POST /messages/:chatId` (with file attachments)

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "success": false
}
```

## Health Check

### Ping Endpoint

- **GET** `/api/v1/ping`
- **Description**: Health check endpoint for monitoring
- **Authentication**: Not required

**Response**:

```json
{
  "status": "ok",
  "message": "pong",
  "timestamp": 1638360000000
}
```

### Root Endpoint

- **GET** `/`
- **Description**: Server status endpoint
- **Authentication**: Not required

**Response**:

```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-06-08T12:00:00.000Z"
}
```

## Additional Notes

### File Uploads

- **Size Limit**: 16KB for JSON payloads
- **Supported**: File attachments in messages
- **Storage**: Managed through cloud storage service (Cloudinary)

### Database

- **Type**: MongoDB with Mongoose ODM
- **Connection**: Auto-retry mechanism with 5 attempts
- **Aggregation**: Complex aggregation pipelines for chat and message queries

### Security Features

- **CORS**: Configurable allowed origins
- **Request IP**: IP address tracking for rate limiting
- **Cookie Parser**: Support for cookie-based authentication
- **Compression**: Response compression enabled
- **Morgan Logging**: Request logging in development/production modes

### Environment Configuration

Required environment variables:

- `CLIENT_URL` - Allowed CORS origins
- `NODE_ENV` - Environment mode (development/production)
- Database connection string
- JWT secret keys
- Cloud storage credentials

### MongoDB Aggregation Pipelines

The API uses MongoDB aggregation pipelines to efficiently transform data before returning it to the client. Two primary aggregation pipelines are implemented:

1. **chatMessageCommonAggregation**: This pipeline transforms `ChatMessage` documents into the `MessageResponseType` format by:
   - Projecting specific fields to include in the response
   - Converting MongoDB ObjectIds to strings for client consumption
   - Conditionally transforming `replyToId` fields to string IDs or null
   - Formatting message content and metadata for consistent representation

```javascript
export const chatMessageCommonAggregation = () => {
  return [
    {
      $project: {
        sender: 1,
        receivers: 1,
        content: 1,
        attachments: 1,
        status: 1,
        reactions: 1,
        edited: 1,
        edits: 1,
        readBy: 1,
        deletedFor: 1,
        replyToId: 1,
        formatting: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $addFields: {
        _id: { $toString: "$_id" },
        chatId: { $toString: "$chatId" },
        replyToId: {
          $cond: {
            if: { $ne: ["$replyToId", null] },
            then: { $toString: "$replyToId" },
            else: null,
          },
        },
      },
    },
  ];
};
```

2. **chatCommonAggregation**: This pipeline transforms `Chat` documents into the `ChatResponseType` format by:
   - Using $lookup to fetch and attach the last message
   - Converting MongoDB ObjectIds to strings
   - Structuring the response with embedded message data

```javascript
const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "chatmessages",
        let: { lastMessageId: "$lastMessage" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$lastMessageId"] },
            },
          },
          ...chatMessageCommonAggregation(),
        ],
        as: "lastMessage",
      },
    },
    {
      $addFields: {
        _id: { $toString: "$_id" },
        lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
      },
    },
  ];
};
```

### Type Conversion

The API handles several types of conversions to ensure consistent data representation:

1. **MongoDB ObjectId to String**: All MongoDB ObjectIds are converted to strings in API responses using the `$toString` operator in aggregation pipelines
2. **Date Handling**: Date objects are preserved as ISO strings in the JSON response
3. **Map to Object**: MongoDB Map fields like `formatting` are converted to regular JavaScript objects
4. **Null Value Handling**: Fields like `replyToId` are explicitly converted to `null` when they don't exist

### Field Projection

The API uses selective field projection to optimize response payloads:

1. **Common Fields**: Core fields like `sender`, `receivers`, and `content` are always included
2. **Optimized Queries**: The aggregation pipelines only request fields that are needed
3. **Consistent Structure**: The response structure remains consistent across different endpoints
4. **Cache-Friendly**: Consistent field selection enables better HTTP caching

## Business Logic

### Message Status Flow

Messages in the system follow a defined status flow:

1. **Sent**: Initial state when a message is created
2. **Delivered**: Updated when the message is delivered to recipients' devices
3. **Read**: Updated when a recipient marks the message as read

Tracking logic:

- Status transitions are one-way (sent → delivered → read)
- Each status change generates a socket event
- Read receipts are stored per-user with timestamps

```javascript
// Example status flow logic
const markMessagesAsRead = async (req, res) => {
  const { chatId } = req.params;
  const { messageIds } = req.body;
  const userId = req.user.id;
  const readAt = new Date();

  // Update message status
  const messages = await ChatMessage.find({
    _id: { $in: messageIds },
    chatId,
  });

  const updatePromises = messages.map(async (message) => {
    // Skip if user is sender or already read
    if (
      message.sender.userId === userId ||
      message.readBy.some((read) => read.userId === userId)
    ) {
      return message;
    }

    // Add user to readBy array
    message.readBy.push({
      userId,
      readAt,
    });

    return message.save();
  });

  await Promise.all(updatePromises);

  // Emit socket event with read status
  emitSocketEvent(req, chatId, ChatEventEnum.MESSAGE_READ_EVENT, {
    chatId,
    readBy: { userId, readAt },
    messageIds: messages.map((message) => message._id.toString()),
  });

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: "Messages marked as read",
    data: {
      chatId,
      readBy: { userId, readAt },
      messageIds: messages.map((message) => message._id.toString()),
    },
  });
};
```

### Chat Participant Management

The system enforces rules for chat participant management:

1. **Direct Chats**: Limited to exactly 2 participants
2. **Group Chats**:
   - Require at least 2 participants
   - Have an admin who has special privileges
   - Support adding/removing participants
   - Allow participants to leave

```javascript
// Example group chat creation logic
const createGroupChat = async (req, res) => {
  const { name, participants } = req.body;
  const userId = req.user.id;

  // Validate participants
  if (!participants || participants.length < 1) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "At least one participant is required",
      data: null,
    });
  }

  // Create group chat
  const chat = await Chat.create({
    name,
    type: "group",
    participants: [
      { userId, role: "admin" },
      ...participants.map((id) => ({ userId: id, role: "member" })),
    ],
    admin: userId,
    createdBy: userId,
  });

  // Transform and return chat
  const transformedChat = await Chat.aggregate([
    { $match: { _id: chat._id } },
    ...chatCommonAggregation(),
  ]).exec();

  // Emit socket event
  emitSocketEvent(
    req,
    participants,
    ChatEventEnum.NEW_CHAT_EVENT,
    transformedChat[0]
  );

  return res.status(201).json({
    statusCode: 201,
    success: true,
    message: "Group chat created successfully",
    data: transformedChat[0],
  });
};
```

### Error Resilience

The API implements several strategies for error resilience:

1. **Retry Mechanisms**: Critical operations use retry logic with exponential backoff
2. **Validation Layers**: Input validation at multiple levels (route, controller, model)
3. **Transaction Support**: Multi-document operations use MongoDB transactions
4. **Graceful Degradation**: Fall back to basic functionality when advanced features fail
5. **Connection Recovery**: Automatic reconnection for both HTTP and WebSocket connections

## Endpoints

### Chat Management

#### Get All Chats

Retrieves all chats for the authenticated user.

**URL**: `/api/v1/chats`  
**Method**: `GET`  
**Auth Required**: Yes

**Query Parameters**:

- `limit` (optional): Number of chats to retrieve (default: 10)
- `page` (optional): Page number for pagination (default: 1)

**Success Response**:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chats retrieved successfully",
  "data": {
    "chats": [ChatResponseType],
    "total": 25,
    "page": 3,
    "limit": 1,
    "hasMore": true
  }
}
```

#### Create or Get One-on-One Chat

```http
POST /api/v1/chats
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
  "data": ChatResponseType,
  "message": "Chat retrieved successfully",
  "success": true
}
```

#### Get Chat by ID

```http
GET /api/v1/chats/chat/:chatId
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Chat retrieved successfully",
  "success": true
}
```

#### Delete One-on-One Chat

```http
DELETE /api/v1/chats/chat/:chatId
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
DELETE /api/v1/chats/chat/:chatId/me
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
POST /api/v1/chats/group
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
  "data": ChatResponseType,
  "message": "Group chat created successfully",
  "success": true
}
```

#### Get Group Chat Details

```http
GET /api/v1/chats/group/:chatId
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Group chat details retrieved successfully",
  "success": true
}
```

#### Update Group Chat

```http
PATCH /api/v1/chats/group/:chatId
```

Request:

```json
{
  "name": "New Group Name",
  "avatarUrl": "avatar_url"
}
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Group chat renamed successfully",
  "success": true
}
```

#### Delete Group Chat

```http
DELETE /api/v1/chats/group/:chatId
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
POST /api/v1/chats/group/:chatId/participants
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
  ]
}
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Participant added successfully",
  "success": true
}
```

#### Remove Participant from Group

```http
DELETE /api/v1/chats/group/:chatId/participants/:userId
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Participant removed successfully",
  "success": true
}
```

#### Leave Group Chat

```http
DELETE /api/v1/chats/group/:chatId/leave
```

Response:

```json
{
  "statusCode": 200,
  "data": ChatResponseType,
  "message": "Left group successfully",
  "success": true
}
```

### Message Management

#### Get All Messages

```http
GET /api/v1/messages/:chatId
```

**Query Parameters**:

- `limit` (optional): Number of chats to retrieve (default: 10)
- `page` (optional): Page number for pagination (default: 1)
- `before` (optional): Date before message is required
- `after` (optional): Date after message is required

Response:

```json
{
  "statusCode": 200,
  "data": {
    "messages":[MessageResponseType],
    "pagination":{
      "total":"total no. of messages",
      "page":"page no.",
      "limit":"limit messages",
      "hasMore":boolean,
    }
  }
  "message": "Messages retrieved successfully",
  "success": true
}
```

#### Send Message

```http
POST /api/v1/messages/:chatId
```

Request:

```json
{
  "content": "Message content",
  "replyToId": "reply_to_messageId" (optional)
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
  "data": MessageResponseType,
  "message": "Message sent successfully",
  "success": true
}
```

#### Delete Message

```http
DELETE /api/v1/messages/:chatId/:messageId
```

Response:

```json
{
  "statusCode": 200,
  "data": messageId,
  "message": "Message deleted successfully",
  "success": true
}
```

#### Update Message Reaction

```http
PATCH /api/v1/messages/:chatId/:messageId/reaction
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
  "data": MessageResponseType,
  "message": "Reaction updated successfully",
  "success": true
}
```

#### Edit Message

```http
PATCH /api/v1/messages/:chatId/:messageId/edit
```

Request:

```json
{
  "content": "Updated message content",
  "replyToId": "reply_to_messageId"
}
```

Response:

```json
{
  "statusCode": 200,
  "data": MessageResponseType,
  "message": "Message edited successfully",
  "success": true
}
```

#### Mark Messages as Read

```http
POST /api/v1/messages/:chatId/read
```

Request:

```json
{
  "messageIds": ["message_id_1", "message_id_2"]
}
```

Response:

```json
{
  "statusCode": 200,
  "data": { "modifiedCount": 2 },
  "message": "Messages marked as read",
  "success": true
}
```

### Message Pin Management

#### Pin Message

```http
POST /api/v1/chats/:chatId/pin/:messageId
```

Response:

```json
{
  "statusCode": 200,
  "data": { "chatId": "chatId", "messageId": "messageId" },
  "message": "Message pinned successfully",
  "success": true
}
```

#### Unpin Message

```http
DELETE /api/v1/chats/:chatId/pin/:messageId
```

Response:

```json
{
  "statusCode": 200,
  "data": { "chatId": "chatId", "messageId": "messageId" },
  "message": "Message unpinned successfully",
  "success": true
}
```

### User Update Webhook

#### User Update Webhook

```http
POST /api/v1/webhook/user
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
  "statusCode": 200,
  "message": "User update processed",
  "success": true
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

## Frontend Integration

### Response Type Handling

The API returns strongly typed responses through both HTTP and WebSocket channels. The frontend should implement proper type definitions to match these responses:

```typescript
// Define types to match API response structures
import type { MessageResponseType, ChatResponseType } from "../types";

// Use these types when consuming API responses
async function getChatMessages(chatId: string): Promise<MessageResponseType[]> {
  const response = await api.get(`/messages/${chatId}`);
  return response.data.data;
}

// Type WebSocket event handlers
socket.on(
  ChatEventEnum.MESSAGE_RECEIVED_EVENT,
  (message: MessageResponseType) => {
    // Handle the strongly typed message object
    addMessageToState(message);
  }
);

socket.on(ChatEventEnum.NEW_CHAT_EVENT, (chat: ChatResponseType) => {
  // Handle the strongly typed chat object
  addChatToState(chat);
});
```

All MongoDB ObjectIds are converted to strings in the API responses, so the frontend should use string IDs when making requests. When displaying data, the frontend can take advantage of the complete type information provided by the response types.

### Error Handling

All API responses include a standardized error structure that should be handled by the frontend. Responses follow this format:

```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success message",
  "success": true,
  "errors": []  // Only populated for error responses
}
```

The frontend should:

1. **Check `success` flag**: Always check the `success` boolean to determine if the request was successful
2. **Parse error messages**: Use the `message` field for user-friendly notifications
3. **Handle detailed errors**: For validation errors, the `errors` array contains specific field errors

### Connection Management

The backend includes connection monitoring. Frontends should implement:

1. **Connection Health Tracking**: Monitor and store the connection state

   ```typescript
   let isConnectionIssue = false;

   // In API interceptors
   api.interceptors.response.use(
     (response) => {
       isConnectionIssue = false;
       return response;
     },
     (error) => {
       if (!error.response) {
         isConnectionIssue = true;
         // Handle connection error
       }
       return Promise.reject(error);
     }
   );

   // Expose connection state
   export const isConnectionHealthy = (): boolean => {
     return !isConnectionIssue;
   };
   ```

2. **Optimistic UI Updates**: Implement optimistic updates for better UX

   ```typescript
   // Example for marking messages as read
   // 1. Update UI immediately
   setMessages((prev) => updateReadStatus(prev, messageIds));

   // 2. Then send API request
   try {
     await markMessagesAsRead({ chatId, messageIds });
   } catch (error) {
     // Log error but don't revert UI to avoid flickering
     console.error("Error marking messages as read:", error);
   }
   ```

3. **Race Condition Prevention**: Handle potential race conditions in socket events

   ```typescript
   // Use timestamps consistently across operations
   const readAt = new Date();

   // Update local state with consistent timestamp
   setMessages((prev) => updateMessagesWithTimestamp(prev, readAt));

   // In socket event handler, use type checking for dates
   const readAtDate =
     data.readAt instanceof Date ? data.readAt : new Date(data.readAt);
   ```

### WebSocket Event Handling

For proper event handling with TypeScript:

```typescript
// Import the response types
import type { MessageResponseType, ChatResponseType } from "../types";

// Handle new messages with proper typing
socket.on(
  ChatEventEnum.MESSAGE_RECEIVED_EVENT,
  (message: MessageResponseType) => {
    // Implementation
  }
);

// Handle edited messages with proper typing
socket.on(
  ChatEventEnum.MESSAGE_EDITED_EVENT,
  (data: {
    messageId: string;
    content: string;
    chatId: string;
    editedAt?: Date | string;
  }) => {
    // Implementation
  }
);

// Handle read receipts with proper date handling
socket.on(
  ChatEventEnum.MESSAGE_READ_EVENT,
  (data: {
    chatId: string;
    readBy: { userId: string; readAt: Date | string };
    messageIds: string[];
  }) => {
    // Implementation with date type checking
    const readAt =
      data.readBy.readAt instanceof Date
        ? data.readBy.readAt
        : new Date(data.readBy.readAt);
  }
);

// Handle chat updates
socket.on(ChatEventEnum.NEW_CHAT_EVENT, (chat: ChatResponseType) => {
  // Implementation
});
```

## User Validation

User validation is handled internally by the backend service. It queries the PostgreSQL database directly to verify user credentials and status. This process does not involve any external API calls to the frontend application.
