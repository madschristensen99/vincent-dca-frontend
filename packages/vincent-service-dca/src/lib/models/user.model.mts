import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, required: true },
  purchaseIntervalMinutes: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
