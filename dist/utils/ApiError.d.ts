interface IApiError extends Error {
    statusCode: number;
    data: unknown;
    success: boolean;
    errors: unknown[];
}
export default class ApiError extends Error implements IApiError {
    statusCode: number;
    data: unknown;
    success: boolean;
    errors: unknown[];
    constructor(statusCode: number, message?: string, errors?: unknown[], stack?: string);
}
export {};
