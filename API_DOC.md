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
- [Response Types](#response-types)
  - [MessageResponseType](#messageresponsetype)
  - [ChatResponseType](#chatresponsetype)
- [Data Transformation Logic](#data-transformation-logic)
  - [MongoDB Aggregation Pipelines](#mongodb-aggregation-pipelines)
  - [Type Conversion](#type-conversion)
  - [Field Projection](#field-projection)
- [Business Logic](#business-logic)
  - [Message Status Flow](#message-status-flow)
  - [Chat Participant Management](#chat-participant-management)
  - [Error Resilience](#error-resilience)
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
    - [Edit Message](#edit-message)
    - [Mark Messages as Read](#mark-messages-as-read)
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
http://localhost:3000
```

## Authentication

All API requests must include a valid JWT token in the Authorization header. The token is obtained during the login process and must be included in all subsequent requests.

### Token Format

```
Authorization: Bearer <token>
```

### Token Structure

The JWT token contains the following claims:

```json
{
  "id": "user_id",
  "name": "user_name",
  "avatarUrl": "avatar_url",
  "email": "user_email",
  "username": "username",
  "role": "user_role",
  "exp": 1234567890, // Expiration time in seconds since epoch
  "iat": 1234567890 // Issued at time in seconds since epoch
}
```

### Token Expiration

- Tokens are valid for 1 hour from the time of issuance
- Expired tokens will result in a 401 Unauthorized response
- The client should handle token expiration by redirecting to the login page

### Error Responses

#### 401 Unauthorized

```json
{
  "statusCode": 401,
  "data": null,
  "message": "Invalid token" | "Token expired" | "Authentication required",
  "success": false
}
```

### Example Request

```http
GET /api/v1/chats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### WebSocket Authentication

WebSocket connections must also include the JWT token in the connection query parameters:

```javascript
const socket = io("http://localhost:3000", {
  query: {
    token: "your_jwt_token",
  },
});
```

## WebSocket Events

### Connection Events

- `connected`: Emitted when a user connects to the socket
- `disconnect`: Emitted when a user disconnects
- `online`: Emitted when a user comes online

### Message Events

- `messageReceived`: Emitted when a new message is received. Emits a `MessageResponseType` object.
- `messageDeleted`: Emitted when a message is deleted. Emits a `MessageResponseType` object.
- `messageReaction`: Emitted when a message reaction is updated. Emits a `MessageResponseType` object.
- `messagePin`: Emitted when a message is pinned/unpinned. Emits a `ChatResponseType` object.
- `messageEdited`: Emitted when a message is edited. Emits an object with structure:
  ```typescript
  {
    messageId: string;
    content: string;
    chatId: string;
    editedAt: Date;
  }
  ```
- `messageRead`: Emitted when messages are marked as read. Emits an object with structure:
  ```typescript
  {
    chatId: string;
    readBy: {
      userId: string;
      readAt: Date;
    };
    messageIds: string[];
  }
  ```

### Chat Events

- `newChat`: Emitted when a new chat is created. Emits a `ChatResponseType` object.
- `chatDeleted`: Emitted when a chat is deleted. Emits a `ChatResponseType` object.
- `leaveChat`: Emitted when a user leaves a group chat. Emits a `ChatResponseType` object.
- `updateGroupName`: Emitted when a group chat name is updated. Emits a `ChatResponseType` object.
- `newParticipantAdded`: Emitted when a new participant is added to a group. Emits a `ChatResponseType` object.
- `participantLeft`: Emitted when a participant leaves a group. Emits a `ChatResponseType` object.

### Typing Indicators

- `typing`: Emitted when a user starts typing
- `stopTyping`: Emitted when a user stops typing

### Error Handling

- `socketError`: Emitted when a socket error occurs

## Response Types

The API uses standardized response types to ensure consistency across all endpoints. These types are used in both HTTP responses and WebSocket events.

### MessageResponseType

The `MessageResponseType` represents the structure of a message after it has been processed through the MongoDB aggregation pipeline.

```typescript
export interface MessageResponseType {
  _id: string; // String representation of MongoDB ObjectId
  sender: User; // User who sent the message
  receivers: User[]; // Array of users who received the message
  chatId: string; // String representation of chat ObjectId
  content: string; // Message content
  attachments: AttachmentType[]; // File attachments
  status: StatusEnum; // Message status (sent, delivered, read)
  reactions: ReactionType[]; // User reactions to the message
  edited: { isEdited: boolean; editedAt: Date }; // Edit status
  edits: EditType[]; // History of edits
  readBy: ReadByType[]; // Users who have read the message
  deletedFor: DeletedForEntry[]; // Users who have deleted the message
  replyToId: string | null; // Reference to parent message if it's a reply
  formatting: Record<string, string>; // Message formatting options
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

### ChatResponseType

The `ChatResponseType` represents the structure of a chat after it has been processed through the MongoDB aggregation pipeline.

```typescript
export interface ChatResponseType {
  _id: string; // String representation of MongoDB ObjectId
  name: string; // Chat name
  lastMessage: MessageResponseType | null; // Last message in the chat
  avatarUrl: string; // Chat avatar URL
  participants: ChatParticipant[]; // Chat participants
  admin: string; // Chat admin user ID
  type: "direct" | "group" | "channel"; // Chat type
  createdBy: string; // Creator user ID
  deletedFor: DeletedForEntry[]; // Users who have deleted the chat
  metadata?: {
    // Additional metadata
    pinnedMessages: string[]; // Pinned message IDs
    customPermissions?: any; // Custom permissions
  };
  messages: MessageResponseType[]; // Chat messages
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

## Data Transformation Logic

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
        formatting: {
          $cond: {
            if: { $ne: ["$formatting", null] },
            then: "$formatting",
            else: {},
          },
        },
      },
    },
  ];
};
```

2. **chatCommonAggregation**: This pipeline transforms `Chat` documents into the `ChatResponseType` format by:
   - Using $lookup to fetch and attach the last message
   - Using $lookup to fetch recent messages
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
      $lookup: {
        from: "chatmessages",
        let: { chatId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$chatId", "$$chatId"] },
            },
          },
          ...chatMessageCommonAggregation(),
          {
            $sort: { createdAt: -1 },
          },
        ],
        as: "messages",
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
POST /api/v1/chats/chat
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
    [MessageResponseType],
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
  "content": "Message content"
  "replyToId":(optional) "Reply to message Id"
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
  "data": MessageResponseType
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
  "data": {"modifiedCount": 2}
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
DELETE /api/v1/messages/:chatId/:messageId/pin
```

Response:

```json
{
  "statusCode": 200,
  "data": "data": {"chatId": "chatId", "messageId": "messageId"},
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
