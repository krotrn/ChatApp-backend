import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatarUrl: { type: String },
    email: { type: String, required: true },
  },
  { collection: "users" }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
