# Chat Backend

A robust real-time chat application backend built with Node.js, Express, TypeScript, MongoDB, and Socket.IO. This service handles all chat-related operations including direct messaging, group chats, message management, and real-time communication.

## Features

- **Real-time Communication**: WebSocket integration using Socket.IO
- **Chat Management**: Create, read, update, and delete functionalities for both direct and group chats
- **Message Handling**: Send, delete, pin, reply to, and react to messages
- **File Attachments**: Support for sending and storing file attachments
- **User Authentication**: JWT-based authentication system
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

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

## Installation and Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/krotrn/ChatApp-backend.git
   cd ChatApp-backend
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

   # Application Configuration
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   PORT=3000

   CLIENT_URL=http://localhost:3000
   INTERNAL_API_KEY=your_internal_api_key
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
- **POST /api/v1/chats/chat**: Create or get a one-on-one chat
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

- **GET /api/v1/messages/:chatId**: Get all messages in a chat
- **POST /api/v1/messages/:chatId**: Send a message
- **DELETE /api/v1/messages/:chatId/:messageId**: Delete a message
- **POST /api/v1/messages/:chatId/reply**: Reply to a message
- **PATCH /api/v1/messages/:chatId/:messageId/reaction**: Update message reaction

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

### Chat Events
- `newChat`: New chat created
- `chatDeleted`: Chat deleted
- `leaveChat`: User leaves a group chat
- `updateGroupName`: Group chat name updated

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
└── README.md            # Project documentation
```

## Error Handling

The API uses consistent error responses:

- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Authentication failure
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

## License

This project is licensed under the [ISC License](LICENSE).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
