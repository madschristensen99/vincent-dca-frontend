import mongoose from 'mongoose';

const purchasedCoinSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true,
    index: true, // Index for faster lookups by schedule
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  coinAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  price: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Price must be a valid decimal number',
    },
  },
  purchaseAmount: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Purchase amount must be a valid decimal number',
    },
  },
  success: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  error: {
    type: String,
  },
  txHash: {
    type: String,
    sparse: true,
    unique: true,
  },
  purchasedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

// Create compound indices for common query patterns
purchasedCoinSchema.index({ scheduleId: 1, purchasedAt: -1 });
purchasedCoinSchema.index({ scheduleId: 1, success: 1 });

export const PurchasedCoin = mongoose.model(
  'PurchasedCoin',
  purchasedCoinSchema
);
