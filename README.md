# Chat Service Backend 🚀

This repository, **Chat_Backend**, contains the backend service for a real-time chat application. It handles CRUD operations for chats and messages using **MongoDB** for storage and provides real-time updates via **Socket.IO**. User management is handled by a separate repository, **CLIENT_REPO**, and this service interacts with CLIENT_REPO for user validation and authentication without storing user data locally in MongoDB.

## Features ✨

- **Chat Management**: Create, retrieve, update, and delete chats (direct and group)
- **Message Management**: Send, retrieve, delete, and reply to messages within chats
- **Real-time Communication**: Utilizes Socket.IO for events like new messages, typing indicators, and chat updates
- **Authentication and Authorization**: Integrates with CLIENT_REPO for user validation using JWT tokens and an internal API key
- **File Handling**: Supports message attachments via Multer
- **Error Handling and Validation**: Custom error handling and request validation middleware

## Project Overview 🔍

This service is built with **Node.js** and **TypeScript**, using **Express** for the API and **Mongoose** for MongoDB interactions. It communicates with CLIENT_REPO to validate users before performing chat-related operations, ensuring no duplicate user data is stored in MongoDB.

## Prerequisites 📋

To run this project locally, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (local or cloud instance, e.g., MongoDB Atlas)
- **CLIENT_REPO** (running and accessible for user management)

## Setup and Installation 🛠️

Follow these steps to set up and run the project locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/krotrn/ChatApp-backend.git
   cd ChatApp-backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in the required values:
     ```
     PORT=5000
     MONGODB_URI=<your-mongodb-connection-string>
     ACCESS_TOKEN_SECRET=<jwt-secret-key>
     CLIENT_URL=<allowed-cors-origins>
     CLIENT_API_URL=<api-base-url>
     INTERNAL_API_KEY=<key-for-CLIENT_REPO-communication>
     ```

4. **Run the Server**:
   - For development with hot reloading:
     ```bash
     npm run dev
     ```
   - For production (after building):
     ```bash
     npm run build
     npm start
     ```

## Project Structure 📂

Here's an overview of the key directories and files:

- **`src/controllers/`**: Logic for chat and message operations
- **`src/models/`**: Mongoose schemas for chats and messages
- **`src/routes/`**: Express routes for API endpoints
- **`src/socket/`**: Socket.IO connection and event handling
- **`src/types/`**: TypeScript type definitions
- **`src/utils/`**: Utility functions (e.g., `ApiResponse`, `FileOperations`)
- **`src/middleware/`**: Custom middleware for authentication, file uploads, etc.
- **`src/database/db.ts`**: MongoDB connection setup
- **`.env.example`**: Template for environment variables
- **`package.json`**: Project dependencies and scripts

## API Endpoints 🌐

### Chat Routes
- **`GET /api/v1/chats`**: Retrieve all chats for the authenticated user
- **`POST /api/v1/chats/chat`**: Create or get a one-on-one chat
- **`POST /api/v1/chats/group`**: Create a group chat
- **`GET /api/v1/chats/group/:chatId`**: Get group chat details
- **`PATCH /api/v1/chats/group/:chatId`**: Rename a group chat
- **`DELETE /api/v1/chats/group/:chatId`**: Delete a group chat

### Message Routes
- **`GET /api/v1/messages/:chatId`**: Get all messages in a chat
- **`POST /api/v1/messages/:chatId`**: Send a message (supports attachments)
- **`DELETE /api/v1/messages/:chatId/:messageId`**: Delete a message

For more information, refer to [API Documentation](API_DOC.md)

*All routes require authentication via JWT tokens from CLIENT_REPO.*

## Real-time Events 🔄

Socket.IO is used for real-time communication. Key events include:

- **`connected`**: User connects to the server
- **`disconnect`**: User disconnects
- **`joinChat`**: User joins a chat room
- **`messageReceived`**: New message is sent
- **`typing`**: User is typing
- **`messageDeleted`**: Message is deleted

See `src/utils/constants.ts` for the full list of events.

## Interacting with CLIENT_REPO 🔗

This service relies on **CLIENT_REPO** for user-related operations:

- **User Validation**: Before chat operations, Chat_Backend calls CLIENT_REPO's internal API (`/api/v1/internal/validate/:userId`) using the `INTERNAL_API_KEY`
- **Authentication**: JWT tokens issued by CLIENT_REPO are validated using `ACCESS_TOKEN_SECRET`

Ensure CLIENT_REPO is running and `CLIENT_API_URL` is set correctly in `.env`.

## Database 🗄️

- **MongoDB**: Stores chats and messages (no user data)

Set up MongoDB instances and update `.env` with their connection URIs.

## Error Handling ❌

Errors are managed with a custom `ApiError` class and a global error handler middleware (`errorHandler.middleware.ts`), ensuring consistent error responses.

## Linting 🧹

The project uses **ESLint** for code quality. Run the linter with:
```bash
npm run lint
```

## Deployment 🌐

To deploy the application:

1. **Build the Project**:
   ```bash
   npm run build
   ```

2. **Set Up Environment Variables**:
   - Configure `.env` in your deployment platform (e.g., Heroku, Vercel, AWS)
   - Example:
     ```
     PORT=5000
     MONGODB_URI=mongodb://<production-uri>
     ACCESS_TOKEN_SECRET=<secret>
     CLIENT_URL=https://your-frontend.com
     CLIENT_API_URL=https://CLIENT_REPO.yourdomain.com
     INTERNAL_API_KEY=<key>
     ```

3. **Start the Server**:
   ```bash
   npm start
   ```

4. **Database and Services**:
   - Use cloud services like MongoDB Atlas
   - Ensure CLIENT_REPO is deployed and accessible

## Contributing 🤝

Contributions are welcome! Follow these steps:

1. Fork the repository
2. Create a feature or bugfix branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Submit a pull request

Please adhere to the code style enforced by ESLint.

## License 📜

This project is licensed under the [MIT License](LICENSE).
