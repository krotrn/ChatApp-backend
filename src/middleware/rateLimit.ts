import rateLimit from "express-rate-limit";
import requestIp from "request-ip";

export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => requestIp.getClientIp(req) || "unknown",
  message: "Too many messages sent, please try again later",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many messages sent, please try again later",
    });
  },
});

export const chatCreationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => requestIp.getClientIp(req) || "unknown",
  message: "Too many chat creations, please try again later",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many chat creations, please try again later",
    });
  },
});

export const fileUploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => requestIp.getClientIp(req) || "unknown",
  message: "Too many file uploads, please try again later",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many file uploads, please try again later",
    });
  },
});
