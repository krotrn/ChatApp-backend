# Chat Backend

This is the backend service for the ChatApp application. It handles real-time messaging, user presence, and other core chat functionalities. It is built with Node.js, Express, and integrates with MongoDB (via Mongoose) for chat data storage and PostgreSQL for user data management.

User validation, previously handled by an API call to the frontend, is now performed directly within this backend service by querying the PostgreSQL database. This change enhances security and efficiency by centralizing user data access.

## Features

- **Real-time Communication**: WebSocket integration using Socket.IO
- **Chat Management**: Create, read, update, and delete functionalities for both direct and group chats
- **Message Handling**: Send, delete, pin, reply to, react to, and edit messages
- **Read Receipts**: Track which messages have been read by which users
- **Message Pagination**: Optimized retrieval of large chat histories
- **File Attachments**: Support for sending and storing file attachments
- **User Authentication**: JWT-based authentication system
- **Robust Error Handling**: Standardized error responses with detailed information
- **Connection Status Monitoring**: Real-time connection health tracking
- **Scalable Architecture**: Well-structured codebase with MVC pattern
- **Docker Support**: Containerization for easy deployment

## Tech Stack

- **Backend**: Node.js, Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ORM
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT (JSON Web Tokens)
- **File Handling**: Multer
- **Containerization**: Docker and Docker Compose

## Prerequisites

- Node.js (v18.x or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

## Installation and Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/chat-backend.git
   cd chat-backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment Configuration**:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration:

   ```
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/chat
   MONGO_USER=yourusername
   MONGO_PASSWORD=yourpassword

   # Application Configuration
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   PORT=3000

   CLIENT_URL=http://localhost:3000
   INTERNAL_API_KEY=your_internal_api_key
   VALIDATION_URL=http://localhost:3000
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: Start development server with hot-reloading
- `npm run build`: Build the TypeScript project
- `npm run stage`: Build and stage changes for commit
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run format`: Format code with Prettier
- `npm run format:check`: Check formatting with Prettier
- `npm run validate`: Run linting and format checking

## API Endpoints

The API is organized around REST. All requests and responses use JSON.

### Authentication

All API requests require authentication via JWT token:

```
Authorization: Bearer <your_jwt_token>
```

### Chat Routes

- **GET /api/v1/chats**: Get all chats for the authenticated user
- **POST /api/v1/chats**: Create or get a one-on-one chat
- **GET /api/v1/chats/chat/:chatId**: Get chat by ID
- **DELETE /api/v1/chats/chat/:chatId**: Delete one-on-one chat
- **DELETE /api/v1/chats/chat/:chatId/me**: Delete chat for the current user

### Group Chat Routes

- **POST /api/v1/chats/group**: Create a group chat
- **GET /api/v1/chats/group/:chatId**: Get group chat details
- **PATCH /api/v1/chats/group/:chatId**: Rename a group chat
- **DELETE /api/v1/chats/group/:chatId**: Delete a group chat
- **POST /api/v1/chats/group/:chatId/participants**: Add participant to group
- **DELETE /api/v1/chats/group/:chatId/participants/:userId**: Remove participant from group
- **DELETE /api/v1/chats/group/:chatId/leave**: Leave a group chat

### Message Routes

- **GET /api/v1/messages/:chatId**: Get all messages in a chat (with pagination)
- **POST /api/v1/messages/:chatId**: Send a message
- **DELETE /api/v1/messages/:chatId/:messageId**: Delete a message
- **POST /api/v1/messages/:chatId/reply**: Reply to a message
- **PATCH /api/v1/messages/:chatId/:messageId/reaction**: Update message reaction
- **PATCH /api/v1/messages/:chatId/:messageId/edit**: Edit a message
- **POST /api/v1/messages/:chatId/read**: Mark messages as read

### Message Pin Routes

- **POST /api/v1/messages/:chatId/:messageId/pin**: Pin a message
- **DELETE /api/v1/messages/:chatId/:messageId/pin**: Unpin a message

For detailed API documentation, see [API_DOC.md](API_DOC.md).

## WebSocket Events

The application uses Socket.IO for real-time communication:

### Connection Events

- `connected`: User connects to the server
- `disconnect`: User disconnects
- `online`: User comes online

### Message Events

- `messageReceived`: New message received
- `messageDeleted`: Message deleted
- `messageReaction`: Message reaction updated
- `messagePin`: Message pinned/unpinned
- `messageEdited`: Message edited
- `messageRead`: Messages marked as read

### Chat Events

- `newChat`: New chat created
- `chatDeleted`: Chat deleted
- `leaveChat`: User leaves a group chat
- `updateGroupName`: Group chat name updated
- `newParticipantAdded`: New participant added to group
- `participantLeft`: Participant removed from group

### Typing Indicators

- `typing`: User starts typing
- `stopTyping`: User stops typing

## Docker Deployment

The project includes Docker and Docker Compose configurations for easy deployment:

1. **Build and run with Docker Compose**:

   ```bash
   docker-compose up -d
   ```

2. **To stop the containers**:
   ```bash
   docker-compose down
   ```

The Docker Compose setup includes:

- The Node.js application container
- A MongoDB container with persistent storage
- Health check configuration

## Project Structure

```
chat-backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── database/        # Database connection
│   ├── middleware/      # Custom middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── socket/          # Socket.IO implementation
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── public/              # Public assets
├── dist/                # Compiled JavaScript
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore file
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── API_DOC.md           # Detailed API documentation
└── README.md            # Project documentation
```

## Response Types

The API uses standardized response types:

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    /* Response data */
  },
  "message": "Success message",
  "success": true
}
```

### Error Response

```json
{
  "statusCode": 404,
  "data": null,
  "message": "Resource not found",
  "success": false,
  "errors": []
}
```

## Recent Enhancements

- **Message Editing**: Added ability to edit sent messages with history tracking
- **Read Receipts**: Track which users have read messages in a chat
- **Optimized Message Retrieval**: Implemented pagination for better performance with large chat histories
- **Rich Text Support**: Added basic formatting support for messages
- **Enhanced Error Handling**: Improved error reporting with standardized response structure
- **Connection Monitoring**: Added built-in connection health tracking
- **Optimistic UI Updates**: Frontend implementation now uses optimistic updates to improve UX
- **Race Condition Prevention**: Fixed potential race conditions in read receipt handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contact

For any questions or suggestions, please open an issue on GitHub.
