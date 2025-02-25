# Chat API Documentation

The Chat API is a RESTful service that allows authenticated users to manage one-on-one and group chat conversations as well as real-time messaging with support for file attachments, reactions, and more. Real-time updates are broadcast via WebSockets.

---

## Base URL

```
http://localhost:5000/api/v1
```

---

## Authentication

Every request to the API must include a valid **JWT-based Bearer Token**. Upon successful login, the access token is issued with the payload:

```json
{
  "id": "user.id",
  "name": "user.name",
  "avatarUrl": "user.avatarUrl",
  "email": "user.email",
  "username": "user.username",
  "role": "user.role"
}
```

### Required Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

If authentication fails, the API returns a `401 Unauthorized` error.

---

## Rate Limits

To prevent abuse, each client is limited to **5000 requests per 15 minutes**. The rate limit details are included in response headers:

```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 900
```

---

## Caching and Error Handling

- **Caching:** Frequently requested data (like chats and messages) is cached using Redis with a 60-second expiry.
- **Error Responses:** Errors use a standard structure and appropriate HTTP status codes. For example, if required fields are missing, a `400 Bad Request` is returned; for insufficient permissions, a `403 Forbidden` is returned.

---

## Endpoints

### 1. **User Update in Chats**

When a user updates their profile (name or avatar), notify all chats they belong to.

#### **Update User in Chats**
```http
POST /api/v1/chats/user-updated
```
**Request Example:**
```json
{
  "id": "user_123",
  "name": "Updated Name",
  "avatarUrl": "http://example.com/new-avatar.jpg"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "message": "User updated."
}
```
*Note: This endpoint updates the name and avatarUrl for the user in all chat participant lists.*

---

### 2. **Chat Endpoints**

#### **Get All Chats**
Retrieve all chat conversations in which the authenticated user is a participant.

**Request:**
```http
GET /api/v1/chats
```
**Response Example:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "663d4147d7d120dca940a4d3",
      "name": "Dev Team",
      "type": "group",
      "participants": [
        {"userId": "user_123", "role": "admin"},
        {"userId": "user_456", "role": "member"}
      ],
      "lastMessage": {
        "content": "Let's meet tomorrow!",
        "sender": "user_123",
        "timestamp": "2025-02-25T14:30:00Z"
      }
    }
  ]
}
```
*Cached responses are returned if available.*

---

#### **Create or Get One-on-One Chat**
Start a direct conversation with another user. If a one-on-one chat already exists, it is returned.

**Request:**
```http
POST /api/v1/chats/chat
Content-Type: application/json
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "participants": [{"userId": "user_789"}],
  "name": "Optional Chat Name"  // name is optional for direct chats
}
```
**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "663d4147d7d120dca940a4d4",
    "type": "direct",
    "participants": [
      {"userId": "current_user_id", "role": "member"},
      {"userId": "user_789", "role": "member"}
    ],
    "createdAt": "2025-02-25T14:35:00Z"
  }
}
```
**Error Cases:**
- `400 Bad Request` – If the participants array is missing or if the user attempts to start a chat with themselves.
- `409 Conflict` – If a direct chat between the specified users already exists.

---

#### **Delete One-on-One Chat**
Deletes the entire one-on-one conversation for all participants.

**Request:**
```http
DELETE /api/v1/chats/chat/:chatId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Chat deleted successfully"
}
```
*On deletion, a cascading delete is performed to remove all associated messages.*

---

#### **Delete Chat for Me**
Mark the chat as deleted for the current user only (without affecting other participants).

**Request:**
```http
DELETE /api/v1/chats/chat/:chatId/me
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {},
  "message": "Chat deleted for you successfully"
}
```
*The chat remains available for other participants.*

---

#### **Create Group Chat**
Create a new group conversation with multiple participants.

**Request:**
```http
POST /api/v1/chats/group
Content-Type: application/json
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "name": "Project Alpha",
  "participants": [
    {"userId": "user_456"},
    {"userId": "user_789"}
  ]
}
```
**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "663d4147d7d120dca940a4d5",
    "name": "Project Alpha",
    "type": "group",
    "admin": "current_user_id",
    "participants": [
      {"userId": "current_user_id", "role": "admin"},
      {"userId": "user_456", "role": "member"},
      {"userId": "user_789", "role": "member"}
    ],
    "createdAt": "2025-02-25T14:40:00Z"
  }
}
```
**Error Cases:**
- `400 Bad Request` – If the name or participants list is missing or if the creator is included in the participants list.
- `409 Conflict` – If a group with the same name already exists.

---

#### **Get Group Chat Details**
Retrieve detailed information about a group chat including its pinned message and last message.

**Request:**
```http
GET /api/v1/chats/group/:chatId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "group_chat_id",
    "name": "Project Alpha",
    "type": "group",
    "admin": "current_user_id",
    "participants": [ ... ],
    "lastMessage": { ... },
    "metadata": {
      "pinnedMessage": ["message_id1"]
    }
  }
}
```
*Results may be served from cache for 60 seconds.*

---

#### **Rename Group Chat**
Update the name of an existing group chat. **Only the admin** can perform this action.

**Request:**
```http
PATCH /api/v1/chats/group/:chatId
Content-Type: application/json
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "name": "New Group Name"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "group_chat_id",
    "name": "New Group Name",
    "type": "group",
    // other fields...
  },
  "message": "Group chat name updated successfully"
}
```
**Error Cases:**
- `404 Not Found` – If the group chat does not exist.
- `403 Forbidden` – If the current user is not the group admin.

---

#### **Delete Group Chat**
Delete a group chat entirely. **Only the admin** can delete the group chat.

**Request:**
```http
DELETE /api/v1/chats/group/:chatId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": [],
  "message": "Group chat deleted successfully"
}
```
*This operation uses a transaction to delete the group chat and all its messages.*

---

#### **Manage Group Participants**

##### **Add Participant**
Add a new participant to an existing group chat. **Only the admin** is allowed.

**Request:**
```http
POST /api/v1/chats/group/:chatId/participant/:participantId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "participants": [
      // existing participants...
      {"userId": "user_999", "role": "member"}
    ]
  },
  "message": "Participant added successfully"
}
```
**Error Cases:**
- `403 Forbidden` – If the current user is not an admin.
- `404 Not Found` – If the group or user does not exist.
- `409 Conflict` – If the participant is already a member.

##### **Remove Participant**
Remove an existing participant from a group chat. **Only the admin** may remove members.

**Request:**
```http
DELETE /api/v1/chats/group/:chatId/participant/:participantId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    // updated group chat details with participant removed
  },
  "message": "Participant removed successfully"
}
```

##### **Leave Group Chat**
Allows a participant to leave a group chat.

**Request:**
```http
DELETE /api/v1/chats/group/:chatId/leave
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    // updated group chat details after leaving
  },
  "message": "Left group successfully"
}
```

---

#### **Pin and Unpin Message**
Group chats support pinning messages for quick reference. **Only the group admin** can pin or unpin a message.

**Pin Message Request:**
```http
POST /api/v1/chats/chat/:chatId/pin/:messageId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    // updated chat object with pinned message in metadata
  },
  "message": "Message pinned successfully"
}
```

**Unpin Message Request:**
```http
DELETE /api/v1/chats/chat/:chatId/pin/:messageId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    // updated chat object with pinned message removed
  },
  "message": "Message unpinned successfully"
}
```
**Error Cases (both endpoints):**
- `404 Not Found` – If the chat or message is not found.
- `403 Forbidden` – If the current user is not an admin.

---

### 3. **Message Endpoints**

#### **Get Chat Messages**
Retrieve all messages from a specific chat conversation. Results are sorted in reverse chronological order and cached for 60 seconds.

**Request:**
```http
GET /api/v1/messages/:chatId
Authorization: Bearer <access_token>
```
**Response Example:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "_id": "663d4147d7d120dca940a4d6",
      "content": "Hello team!",
      "sender": "user_123",
      "attachments": [],
      "reactions": [],
      "createdAt": "2025-02-25T14:45:00Z"
    }
  ],
  "message": "Messages fetched successfully"
}
```

---

#### **Send Message**
Send a message to a chat conversation with optional file attachments. The API validates receivers and processes attachments, storing files on the server.

**Request:**
```http
POST /api/v1/messages/:chatId
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```
**Body Example:**
```json
{
  "content": "Check this file",
  "attachments": [file]
}
```
**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "663d4147d7d120dca940a4d7",
    "content": "Check this file",
    "attachments": [
      {
        "url": "http://localhost:5000/images/file123.jpg",
        "localPath": "public/images/file123.jpg"
      }
    ],
    "createdAt": "2025-02-25T14:50:00Z"
  },
  "message": "Message saved successfully"
}
```
**Error Cases:**
- `400 Bad Request` – If neither content nor attachments are provided.
- `404 Not Found` – If the chat does not exist.

---

#### **Delete Message**
Remove a specific message from a chat conversation. Only the sender is permitted to delete their own message. If the message includes attachments, the files are also removed from the local storage.

**Request:**
```http
DELETE /api/v1/messages/:chatId/:messageId
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "statusCode": 200,
  "data": { /* deleted message details */ },
  "message": "Message deleted successfully"
}
```
**Error Cases:**
- `404 Not Found` – If the chat or message does not exist.
- `403 Forbidden` – If the current user is not the sender of the message.

---

#### **Update Message Reaction**
Add, update, or remove a reaction (emoji) to a message. If the same reaction is already applied by the user, it will be removed.

**Request:**
```http
POST /api/v1/messages/:chatId/:messageId/reaction
Content-Type: application/json
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "emoji": "🔥"
}
```
**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "reactions": [
      {"userId": "current_user_id", "emoji": "🔥"}
    ]
  },
  "message": "Reaction updated successfully"
}
```
**Error Cases:**
- `400 Bad Request` – If the emoji is missing.
- `404 Not Found` – If the message does not exist.

---

#### **(Optional) Reply to Message**
*Note: The implementation includes a reply feature that links a new message to the original (reply-to) message. If exposed via an endpoint, it would resemble the Send Message endpoint with an additional `replyTo` field.*

**Example Request:**
```http
POST /api/v1/messages/:chatId/reply/:messageId
Content-Type: application/json
Authorization: Bearer <access_token>
```
**Body:**
```json
{
  "content": "I agree with your point."
}
```
**Response:**
```json
{
  "statusCode": 201,
  "data": { /* reply message details */ },
  "message": "Reply sent successfully"
}
```

---

### 4. **WebSocket Events**

Real-time updates are broadcast to connected clients using WebSockets. Clients should listen for these events to receive immediate notifications.

#### **Connection**
```javascript
socket.on('connected', () => {
  console.log('Connected to chat service');
});
```

#### **Message Events**
- **New Message:**  
  ```javascript
  socket.on('messageReceived', (message) => {
    console.log('New message:', message);
  });
  ```
- **Deleted Message:**  
  ```javascript
  socket.on('messageDeleted', (deletedMessage) => {
    console.log('Message deleted:', deletedMessage);
  });
  ```

#### **Group Chat Events**
- **Group Renamed:**  
  ```javascript
  socket.on('updateGroupName', (updatedGroup) => {
    console.log('Group renamed:', updatedGroup);
  });
  ```
- **Participant Left or Removed:**  
  ```javascript
  socket.on('leaveChatEvent', (chat) => {
    console.log('Chat updated:', chat);
  });
  ```
- **New Chat Event (when added to a chat):**  
  ```javascript
  socket.on('newChatEvent', (chat) => {
    console.log('New chat received:', chat);
  });
  ```

---

## Final Notes

- **Caching:** Both chat and message endpoints utilize Redis caching. Clients should note that cached data is refreshed every 60 seconds.
- **Transactions:** Deletion of group chats uses MongoDB transactions to ensure that both the chat document and associated messages are deleted consistently.
- **Error Handling:** All endpoints follow a consistent error response structure with clear HTTP status codes for common issues like authentication, authorization, and invalid input.