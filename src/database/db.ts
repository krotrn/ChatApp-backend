import mongoose from "mongoose";
import ApiError from "../utils/ApiError";

const { MONGODB_URI } = process.env;

const connectDB = async (): Promise<typeof mongoose> => {
  if (!MONGODB_URI) {
    throw new ApiError(500, "MONGODB_URI is not defined.");
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI);
    console.log("✔ MongoDB connected");

    connection.connection.on("error", (err) => {
      console.error("MongoDB runtime error:", err);
    });

    return connection;
  } catch (dbErr) {
    console.error("MongoDB connection error:", dbErr);
    throw dbErr;
  }
};

export default connectDB;
