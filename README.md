# Chat Backend

A production-ready real-time chat backend service built with Node.js, Express, and TypeScript. This service powers comprehensive chat functionality including direct messaging, group chats, file sharing, and real-time communication features. It uses MongoDB for chat data storage and integrates with external user validation services.

The backend provides RESTful APIs for chat management and WebSocket connections for real-time messaging, typing indicators, user presence, and live notifications.

## Features

- **Real-time Communication**: WebSocket integration using Socket.IO for instant messaging
- **Comprehensive Chat Management**:
  - Create and manage one-on-one conversations
  - Group chat creation, member management (add/remove participants)
  - Chat archival and deletion functionality
- **Advanced Message Operations**:
  - Send, edit, delete, and reply to messages
  - Pin/unpin important messages in chats
  - React to messages with emojis
  - Message read receipts and status tracking
- **File Attachment Support**: Upload and share files with URL-based storage
- **Real-time Features**:
  - Live typing indicators
  - User online/offline presence tracking
  - Instant message delivery and notifications
- **Authentication & Security**:
  - JWT-based authentication system
  - Rate limiting protection (5000 requests per 15 minutes)
  - CORS configuration for secure cross-origin requests
- **Performance & Monitoring**:
  - Message pagination for efficient data loading
  - Request logging with Morgan
  - Response compression for improved performance
  - Connection health monitoring
- **Developer Experience**:
  - Full TypeScript support with strict typing
  - Comprehensive API documentation
  - ESLint and Prettier for code quality
  - Hot-reloading development environment

## Tech Stack

- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type-safe development
- **Database**: MongoDB with Mongoose ODM for chat data storage
- **Real-time Communication**: Socket.IO for WebSocket connections
- **Authentication**: JWT (JSON Web Tokens) for secure authentication
- **File Upload**: Multer for handling multipart/form-data
- **External Integrations**:
  - PostgreSQL client (`pg`) for user validation
  - Axios for HTTP requests to external services
- **Development Tools**:
  - ESLint with TypeScript support for code linting
  - Prettier for code formatting
  - ts-node-dev for development hot-reloading
- **Middleware & Utilities**:
  - CORS for cross-origin resource sharing
  - Morgan for HTTP request logging
  - Express Rate Limit for API protection
  - Compression for response optimization
  - Cookie Parser for cookie handling
  - Request IP for client IP detection

## Prerequisites

- **Node.js**: Version 18.x or higher (based on TypeScript definitions)
- **MongoDB**: Local installation or MongoDB Atlas cloud instance
- **Package Manager**: npm (comes with Node.js) or yarn
- **Environment**: Access to external user validation service (PostgreSQL-based)

## Installation and Setup

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/krotrn/chat-backend.git
    cd chat-backend
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Copy the example environment file and configure your settings:

    ```bash
    cp .env.example .env
    ```

    Edit the `.env` file with your configuration:

    ```bash
    # MongoDB Configuration
    MONGODB_URI=mongodb://localhost:27017/chat-app
    MONGO_USER=your_mongo_username
    MONGO_PASSWORD=your_mongo_password

    # Application Configuration
    JWT_SECRET=your_super_secret_jwt_key
    NODE_ENV=development
    PORT=8000

    # External Service Configuration
    CLIENT_URL=http://localhost:3000
    DATABASE_URL=postgres://user:password@localhost:5432/your_database
    ```

4.  **Start the development server**:

    ```bash
    npm run dev
    ```

    The server will start on `http://localhost:8000` (or your configured PORT) with hot-reloading enabled.

5.  **Verify the setup**:
    - Visit `http://localhost:8000/api/v1/health` to check if the server is running
    - Check the console for successful MongoDB connection
    - Ensure WebSocket connection is available at `ws://localhost:8000`

## Scripts

- `npm run dev`: Start development server with hot-reloading using `ts-node-dev`.
- `npm run build`: Compile TypeScript to JavaScript.
- `npm run stage`: Compile TypeScript and stage all changes for commit (`tsc && git add .`).
- `npm run lint`: Lint TypeScript files using ESLint.
- `npm run lint:fix`: Automatically fix ESLint issues.
- `npm run format`: Format code with Prettier.
- `npm run format:check`: Check formatting with Prettier without making changes.
- `npm run validate`: Run both linting and format checking.

## API Endpoints

The chat backend provides a comprehensive RESTful API organized around REST principles. All requests and responses use JSON format and follow standardized response structures.

### Base URL

```
http://localhost:8000/api/v1
```

### Authentication

Most API requests require authentication via a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### API Categories

- **Chat Management** (`/chats/*`): 14 endpoints for creating, managing, and deleting conversations
- **Message Operations** (`/messages/*`): 7 endpoints for sending, editing, and managing messages
- **Webhook Integration** (`/webhooks/*`): 3 endpoints for external service integration
- **Health Check** (`/health`): Server status monitoring

### Quick Reference

**Popular Endpoints:**

- `POST /chats` - Create a new chat (one-on-one or group)
- `GET /chats` - Get all user's chats with pagination
- `POST /messages` - Send a message to a chat
- `GET /messages/:chatId` - Get messages from a specific chat
- `POST /chats/:chatId/pin/:messageId` - Pin a message in a chat
- `GET /health` - Check server health status

📖 **For complete API documentation with request/response examples, authentication details, and WebSocket events, see [API_DOC.md](./API_DOC.md)**

## WebSocket Events

The application uses Socket.IO for real-time communication. The backend supports **25+ WebSocket events** across different categories:

### Event Categories

- **🔗 Connection & Presence** (8 events): User online/offline status, connection management
- **💬 Chat Room Management** (4 events): Joining/leaving chats, participant updates
- **📨 Messaging & Interactions** (9 events): Real-time messaging, typing indicators, reactions
- **⚙️ Chat Metadata** (5 events): Chat creation, updates, deletions

### Key Real-time Features

- **Live Messaging**: Instant message delivery with `messageReceived` event
- **Typing Indicators**: Real-time typing status with `typing`/`stopTyping` events
- **User Presence**: Online/offline status tracking with `userOnline`/`userOffline` events
- **Message Interactions**: Live reactions, pins, edits, and deletions
- **Group Management**: Real-time participant additions/removals

### Example Events

```javascript
// Client connects and joins a chat
socket.emit("joinChat", { chatId: "chat123" });

// Send typing indicator
socket.emit("typing", { chatId: "chat123", userId: "user456" });

// Receive new message
socket.on("messageReceived", (messageData) => {
  // Handle incoming message
});

// Track user presence
socket.on("userIsOnline", ({ userId }) => {
  // Update user status to online
});
```

📖 **For the complete list of WebSocket events with payload structures and usage examples, see [API_DOC.md](./API_DOC.md#websocket-events)**

## Project Structure

```
chat-backend/
├── src/
│   ├── controllers/     # Request handlers and business logic
│   │   ├── chat/        # Chat management controllers (general, group, one-on-one, pin)
│   │   └── message/     # Message operation controllers
│   ├── database/        # Database connection setup (MongoDB)
│   ├── middleware/      # Express middleware (auth, error handling, validation)
│   ├── models/          # Mongoose schemas and models for MongoDB
│   ├── routes/          # API route definitions (chat, message, webhooks)
│   ├── socket/          # Socket.IO event handlers and real-time logic
│   ├── types/           # TypeScript type definitions and interfaces
│   ├── utils/           # Utility functions, constants, and helper modules
│   └── index.ts         # Application entry point and server configuration
├── public/              # Static assets directory
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore configuration
├── eslint.config.mjs    # ESLint configuration
├── LICENSE              # MIT License file
├── package.json         # Dependencies, scripts, and project metadata
├── tsconfig.json        # TypeScript compiler configuration
├── API_DOC.md           # Comprehensive API documentation
└── README.md            # Project documentation (this file)
```

### Key Directories

- **`src/controllers/`**: Contains organized business logic split by feature (chat management, message operations)
- **`src/routes/`**: Express route definitions with proper middleware integration
- **`src/socket/`**: Real-time WebSocket event handling for instant communication
- **`src/models/`**: MongoDB schemas using Mongoose for data modeling
- **`src/types/`**: TypeScript interfaces ensuring type safety across the application
- **`src/utils/`**: Shared utilities, constants, and helper functions

## Response Types

The API aims to use standardized response structures.

### Success Response Example

```json
{
  "statusCode": 200,
  "data": {
    /* Response data */
  },
  "message": "Operation successful",
  "success": true
}
```

### Error Response Example

```json
{
  "statusCode": 404,
  "data": null,
  "message": "Resource not found",
  "success": false,
  "errors": [
    /* Optional: array of specific error details */
  ]
}
```

## Contributing

We welcome contributions to improve the chat backend! Please follow these steps:

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow the coding standards**:
   - Run `npm run validate` to check linting and formatting
   - Ensure TypeScript compilation passes: `npm run build`
   - Write meaningful commit messages
4. **Commit your changes**: `git commit -m 'Add some amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request** with a clear description of the changes

### Development Guidelines

- Maintain TypeScript strict mode compliance
- Follow existing code organization patterns
- Add appropriate error handling and logging
- Update API documentation for new endpoints
- Test WebSocket events thoroughly

## License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/krotrn/chat-backend/issues)
- **Documentation**: See [API_DOC.md](./API_DOC.md) for detailed API reference
- **Questions**: Open a discussion or issue on the GitHub repository

---

**Built with ❤️ using Node.js, TypeScript, and Socket.IO**
