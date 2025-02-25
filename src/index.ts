import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";
const allowedOrigins = CLIENT_URL === "*" ? "*" : CLIENT_URL.split(",").map(url => url.trim());

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
app.set("io", io);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(requestIp.mw());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.clientIp || req.ip || "unknown",
  handler: (_, __, ___, options) => {
    throw new Error(
      `Too many requests. You are allowed ${options.limit} requests per ${options.windowMs / 60000} minutes.`
    );
  },
});

app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import chatRouter from "./routes/chat.routes";
import messageRouter from "./routes/message.routes";
import webhookRouter from "./routes/webhooks.route";
import connectDB from "./database/db";
import { errorHandler } from "./middleware/errorHandler.middleware";
import { initializeSocketIO } from "./socket";

initializeSocketIO(io);

// API Routes
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/webhook", webhookRouter);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
})();
