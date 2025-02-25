import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    unique: true,
    required: true,
    lowercase: true, // Ethereum addresses should be lowercase
    match: /^0x[a-fA-F0-9]{40}$/, // Validate Ethereum address format
  },
  purchaseIntervalSeconds: {
    type: Number,
    required: true,
    min: 10, // Minimum 10 seconds
    max: 31536000, // Maximum 1 year
  },
  purchaseAmount: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        // Validate that it's a proper decimal string
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Purchase amount must be a valid decimal number',
    },
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
    index: true, // Index for faster queries on active status
  },
  registeredAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true, // Index for faster sorting/querying by registration date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create compound index for common query patterns
userSchema.index({ active: 1, registeredAt: 1 });

export const User = mongoose.model('User', userSchema);
