import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, required: true },
  purchaseIntervalSeconds: { type: Number, required: true },
  purchaseAmount: { type: String, required: true },
  registeredAt: { type: Date, required: true, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  active: { type: Boolean, required: true, default: true },
});

export const User = mongoose.model('User', userSchema);
