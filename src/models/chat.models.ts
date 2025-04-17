import mongoose, { Schema } from "mongoose";

const participantSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String, required: true },
  role: { type: String, enum: ["member", "admin"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
});

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    participants: [participantSchema],
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
    deletedFor: {
      type: [
        {
          userId: String,
          deletedAt: Date,
        },
      ],
      default: [],
    },
    metadata: {
      type: {
        pinnedMessage: {
          type: [
            {
              type: Schema.Types.ObjectId,
              ref: "ChatMessage",
            },
          ],
          default: [],
        },
        customePermissions: {
          type: Schema.Types.Mixed,
          default: {},
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ participants: 1, updatedAt: -1 });

export const Chat = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
