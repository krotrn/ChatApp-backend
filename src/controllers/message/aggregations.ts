export const chatMessageCommonAggregation = () => {
  return [
    {
      $project: {
        sender: 1,
        receivers: 1,
        content: 1,
        attachments: 1,
        status: 1,
        reactions: 1,
        edited: 1,
        edits: 1,
        readBy: 1,
        deletedFor: 1,
        replyToId: 1,
        formatting: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $addFields: {
        _id: { $toString: "$_id" },
        chatId: { $toString: "$chatId" },
        replyToId: {
          $cond: {
            if: { $ne: ["$replyToId", null] },
            then: { $toString: "$replyToId" },
            else: null,
          },
        },
        formatting: {
          $cond: {
            if: { $ne: ["$formatting", null] },
            then: "$formatting",
            else: {},
          },
        },
      },
    },
  ];
};
