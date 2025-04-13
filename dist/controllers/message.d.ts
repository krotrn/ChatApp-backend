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
        edits: number;
        readBy: number;
        deletedFor: number;
        replyToId: number;
        formatting: number;
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
        replyToId: {
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
        formatting: {
            $cond: {
                if: {
                    $ne: (string | null)[];
                };
                then: string;
                else: {};
            };
        };
    };
    $project?: undefined;
})[];
declare const getAllMessages: (req: Request, res: Response) => Promise<void>;
declare const sendMessage: (req: Request, res: Response) => Promise<void>;
declare const deleteMessage: (req: Request, res: Response) => Promise<void>;
declare const deleteMessageForMe: (req: Request, res: Response) => Promise<void>;
declare const replyMessage: (req: Request, res: Response) => Promise<void>;
declare const updateReaction: (req: Request, res: Response) => Promise<void>;
declare const editMessage: (req: Request, res: Response) => Promise<void>;
/**
 * @desc    Mark messages as read
 * @route   POST /api/v1/messages/:chatId/read
 * @access  Private
 */
declare const markMessagesAsRead: (req: Request, res: Response) => Promise<void>;
export { getAllMessages, sendMessage, deleteMessage, replyMessage, updateReaction, editMessage, markMessagesAsRead, deleteMessageForMe, };
