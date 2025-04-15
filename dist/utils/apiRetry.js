"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resilientApiCall = void 0;
const resilientApiCall = async (fn, retries = 3) => {
    try {
        return await fn();
    }
    catch (error) {
        if (retries > 0) {
            await new Promise((res) => setTimeout(res, 1000 * (4 - retries)));
            return (0, exports.resilientApiCall)(fn, retries - 1);
        }
        throw error;
    }
};
exports.resilientApiCall = resilientApiCall;
//# sourceMappingURL=apiRetry.js.map