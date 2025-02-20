import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    console.log("Error connecting to MongoDB: ", error);
    process.exit(1);
  }
};

export default connectDB;