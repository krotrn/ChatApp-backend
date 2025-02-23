import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import dotenv from 'dotenv';

const app = express();
const httpServer = http.createServer(app);

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL;

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});
app.set("io", io);

app.use(
  cors({
    origin: CLIENT_URL === "*" ? "*" : CLIENT_URL?.split(","),
    credentials: true,
  })
);
app.use(requestIp.mw());

const limiter = rateLimit({
  windowMs: 15 * 60 * 100,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.clientIp || "unknown";
  },
  handler: (_, __, ___, options) => {
    throw new Error(
      `There are too many requests. You are only allowed ${
        options.limit
      } requests per ${options.windowMs / 60000} minutes`
    );
  },
});

app.use(limiter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); 
app.use(cookieParser());

// Routes
import chatRouter from './routes/chat.routes';
import messageRouter from './routes/message.routes'
import connectDB from "./database/db";
import { errorHandler } from "./middleware/errorHandler.middleware";

app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/messages", messageRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${PORT}`);
});
