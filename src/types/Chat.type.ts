import mongoose from 'mongoose';
export interface ChatType extends mongoose.Document {
  name: string;
  lastMessage?: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  admin: mongoose.Types.ObjectId;
}