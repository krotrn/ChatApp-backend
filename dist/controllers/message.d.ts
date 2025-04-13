import type { Request, Response } from "express";
export declare const chatMessageCommonAggregation: () => ({
    $project: {
        sender: number;
        receivers: number;
        content: number;
        attachments: number;
        status: number;
        reactions: number;
        edited: number;
        isDeleted: number;
        replyTo: number;
        createdAt: number;
        updatedAt: number;
    };
    $addFields?: undefined;
} | {
    $addFields: {
        _id: {
            $toString: string;
        };
        chatId: {
            $toString: string;
        };
        replyTo: {
            $cond: {
                if: {
                    $ne: (string | null)[];
                };
                then: {
                    $toString: string;
                };
                else: null;
            };
        };
    };
    $project?: undefined;
})[];
declare const getAllMessages: (req: Request, res: Response) => Promise<void>;
declare const sendMessage: (req: Request, res: Response) => Promise<void>;
declare const deleteMessage: (req: Request, res: Response) => Promise<void>;
declare const replyMessage: (req: Request, res: Response) => Promise<void>;
declare const updateReaction: (req: Request, res: Response) => Promise<void>;
export { getAllMessages, sendMessage, deleteMessage, replyMessage, updateReaction, };
