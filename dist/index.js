"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const request_ip_1 = __importDefault(require("request-ip"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_1 = __importDefault(require("morgan"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
app.use((0, morgan_1.default)("dev"));
const CLIENT_URL = process.env.CLIENT_URL || "*";
const allowedOrigins = CLIENT_URL === "*" ? "*" : CLIENT_URL.split(",").map((url) => url.trim());
console.log("Allowed Origins:", allowedOrigins);
const io = new socket_io_1.Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});
app.set("io", io);
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(request_ip_1.default.mw());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => request_ip_1.default.getClientIp(req) || "unknown",
});
app.use(limiter);
app.use(express_1.default.json({ limit: "16kb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "16kb" }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
app.get("/", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString(),
    });
});
// Routes
const chat_1 = __importDefault(require("./routes/chat"));
const message_1 = __importDefault(require("./routes/message"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const db_1 = __importDefault(require("./database/db"));
const errorHandler_1 = require("./middleware/errorHandler");
const socket_1 = require("./socket");
(0, socket_1.initializeSocketIO)(io);
console.log("Authenticating...");
// API Routes
app.use("/api/v1/chats", chat_1.default);
app.use("/api/v1/messages", message_1.default);
app.use("/api/v1/webhook", webhooks_1.default);
app.use(errorHandler_1.errorHandler);
const PORT = process.env.PORT || 5000;
(async () => {
    try {
        await (0, db_1.default)();
        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
})();
//# sourceMappingURL=index.js.map