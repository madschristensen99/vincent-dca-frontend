// Schedule model
import mongoose from 'mongoose';

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
  }
});

// Create indexes for efficient queries
scheduleSchema.index({ walletAddress: 1, active: 1 });
scheduleSchema.index({ registeredAt: -1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export { Schedule, scheduleSchema };
