"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_1 = __importDefault(require("../controllers/webhook"));
const router = (0, express_1.Router)();
router.post("/user", webhook_1.default);
exports.default = router;
//# sourceMappingURL=webhooks.js.map