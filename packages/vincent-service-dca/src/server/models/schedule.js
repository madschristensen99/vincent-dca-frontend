// Schedule model
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: String,
    required: true
  },
  tokenSymbol: {
    type: String,
    required: false
  },
  tokenName: {
    type: String,
    required: false
  },
  tokenAddress: {
    type: String,
    required: false
  },
  tokenAmount: {
    type: String,
    required: false
  },
  txHash: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'pending'],
    default: 'pending'
  },
  error: {
    type: String,
    required: false
  }
});

const scheduleSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    index: true,
  },
  purchaseIntervalSeconds: {
    type: Number,
    required: true,
    min: 10,
    max: 31536000,
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
  active: {
    type: Boolean,
    required: true,
  },
  registeredAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastExecutedAt: {
    type: Date,
    default: null,
  },
  // We'll keep this for backward compatibility but it won't be used
  // for determining which token to buy in the new implementation
  tokenInfo: {
    symbol: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    contractAddress: {
      type: String,
      default: '',
    },
    uuid: {
      type: String,
      default: '',
    }
  },
  // Add transactions array to store history of purchases
  transactions: [transactionSchema]
});

// Create indexes for efficient queries
scheduleSchema.index({ walletAddress: 1, active: 1 });
scheduleSchema.index({ registeredAt: -1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export { Schedule, scheduleSchema };
