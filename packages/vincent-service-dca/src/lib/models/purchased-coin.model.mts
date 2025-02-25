import mongoose from 'mongoose';

const purchasedCoinSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // Index for faster lookups by user
  },
  coinAddress: {
    type: String,
    required: true,
    lowercase: true, // Ethereum addresses should be lowercase
    match: /^0x[a-fA-F0-9]{40}$/, // Validate Ethereum address format
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true, // Coin symbols are typically uppercase
  },
  amount: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        // Validate that it's a proper decimal string
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Amount must be a valid decimal number',
    },
  },
  priceAtPurchase: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        // Validate that it's a proper decimal string
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Price must be a valid decimal number',
    },
  },
  txHash: {
    type: String,
    unique: true,
    required: true,
    match: /^0x[a-fA-F0-9]{64}$/, // Validate transaction hash format
  },
  success: {
    type: Boolean,
    required: true,
    index: true, // Index for faster queries on success status
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
    index: true, // Index for faster sorting by purchase date
  },
});

// Create compound index for common query patterns
purchasedCoinSchema.index({ userId: 1, purchasedAt: -1 });
purchasedCoinSchema.index({ userId: 1, success: 1 });

export const PurchasedCoin = mongoose.model(
  'PurchasedCoin',
  purchasedCoinSchema
);
