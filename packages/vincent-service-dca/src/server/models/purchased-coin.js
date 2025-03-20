// Purchased Coin model
import mongoose from 'mongoose';
import { scheduleSchema } from './schedule.js';

const purchasedCoinSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: false,
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true,
  },
  tokenSymbol: {
    type: String,
    required: true,
  },
  tokenName: {
    type: String,
    required: true,
  },
  tokenAddress: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  purchaseAmount: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Purchase amount must be a valid decimal number',
    },
  },
  tokenAmount: {
    type: String,
    required: false,
  },
  txHash: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending'],
    default: 'pending',
  },
  error: {
    type: String,
    required: false,
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Create indexes for efficient queries
purchasedCoinSchema.index({ walletAddress: 1, purchaseDate: -1 });
purchasedCoinSchema.index({ scheduleId: 1, purchaseDate: -1 });
purchasedCoinSchema.index({ scheduleId: 1, status: 1 });

const PurchasedCoin = mongoose.model('PurchasedCoin', purchasedCoinSchema);

export { PurchasedCoin, purchasedCoinSchema };
