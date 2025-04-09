import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const connection = await mongoose.connect(
      MONGODB_URI || "mongodb://localhost:27017/chat"
    );
    console.error("MongoDB Connected Successfully");
    return connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
