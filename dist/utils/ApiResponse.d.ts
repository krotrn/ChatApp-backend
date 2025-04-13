declare class ApiResponse {
    statusCode: number;
    data: unknown;
    message: string;
    success: boolean;
    constructor(statusCode: number, data: unknown, message?: string);
}
export { ApiResponse };
