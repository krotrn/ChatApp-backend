import mongoose from "mongoose";
import ApiError from "../utils/ApiError";

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async (): Promise<typeof mongoose> => {
  if (!MONGODB_URI) {
    throw new ApiError(500, "MONGODB_URI is not defined.");
  }
  try {
    const connection = await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected Successfully");
    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
