import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    participants: [
      {
        type: String,
        required: true,
      },
    ],
    admin: {
      type: String,
    },
    type: {
      type: String,
      enum: ["direct", "group", "channel"],
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    deletedFor: [
      {
        user: { type: String },
        deletedAt: Date,
      },
    ],
    metadata: {
      pinnedMessage: [
        {
          type: Schema.Types.ObjectId,
          ref: "ChatMessage",
        },
      ],
      customePermissions: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ participants: 1, updatedAt: -1 });

export const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
