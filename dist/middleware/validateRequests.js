"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = void 0;
const axios_1 = __importDefault(require("axios"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const validateUser = async (userId) => {
    try {
        const { data } = await axios_1.default.get(`${process.env.CLIENT_URL}/api/v1/internal/validate/${userId}`, {
            headers: { "x-internal-api-key": process.env.INTERNAL_API_KEY },
            timeout: 3000,
        });
        if (!data.success) {
            throw new ApiError_1.default(500, "Validation service error");
        }
        return data.valid;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            throw new ApiError_1.default(error.response?.status || 500, error.response?.data?.error || "User validation failed");
        }
        throw new ApiError_1.default(500, "Internal server error during validation");
    }
};
exports.validateUser = validateUser;
//# sourceMappingURL=validateRequests.js.map