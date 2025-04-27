import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import requestIp from "request-ip";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import compression from "compression";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

app.use(compression());

const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(morgan(morganFormat));

const CLIENT_URL = process.env.CLIENT_URL || "*";
const allowedOrigins =
  CLIENT_URL === "*" ? "*" : CLIENT_URL.split(",").map((url) => url.trim());
console.log("Allowed Origins:", allowedOrigins);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  connectTimeout: 10000,
  transports: ["websocket", "polling"],
});

app.set("io", io);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(requestIp.mw());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => requestIp.getClientIp(req) || "unknown",
  skip: (req) => req.method === "OPTIONS",
});

app.use(limiter);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(
  express.static("public", {
    maxAge: "1d",
  }),
);
app.use(cookieParser());

app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "pong",
    timestamp: Date.now(),
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Routes
import chatRouter from "./routes/chat";
import messageRouter from "./routes/message";
import webhookRouter from "./routes/webhooks";
import connectDB from "./database/db";
import { errorHandler } from "./middleware/errorHandler";
import { initializeSocketIO } from "./socket";

const connectWithRetry = async () => {
  let retries = 5;
  while (retries) {
    try {
      console.log(`Attempting to connect to database (${6 - retries}/5)...`);
      await connectDB();
      console.log("Database connected successfully");
      return true;
    } catch (error) {
      retries -= 1;
      console.log(
        `Database connection failed, retries left: ${retries}`,
        error,
      );
      if (retries) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return false;
};

initializeSocketIO(io);

// API Routes
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/webhook", webhookRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 10000;

(async (): Promise<void> => {
  try {
    const dbConnected = await connectWithRetry();
    if (!dbConnected) {
      console.error("Failed to connect to database after multiple attempts");
      console.log("Starting server without database connection...");
    }

    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
})();
