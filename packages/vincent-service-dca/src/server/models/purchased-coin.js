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
    required: false,
  },
  price: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d*\.?\d+$/.test(v);
      },
      message: 'Price must be a valid decimal number',
    },
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
  success: {
    type: Boolean,
    required: true,
  },
  txHash: {
    type: String,
    required: false,
  },
  error: {
    type: String,
    required: false,
  },
  purchasedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

// Create indexes for efficient queries
purchasedCoinSchema.index({ walletAddress: 1, purchasedAt: -1 });
purchasedCoinSchema.index({ scheduleId: 1, purchasedAt: -1 });
purchasedCoinSchema.index({ scheduleId: 1, success: 1 });

const PurchasedCoin = mongoose.model('PurchasedCoin', purchasedCoinSchema);

export { PurchasedCoin, purchasedCoinSchema };
