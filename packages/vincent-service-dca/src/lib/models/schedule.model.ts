import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true, // Ethereum addresses should be lowercase
    match: /^0x[a-fA-F0-9]{40}$/, // Validate Ethereum address format
    index: true, // Index for faster lookups by wallet address
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

// Create compound indices for common query patterns
scheduleSchema.index({ walletAddress: 1, active: 1 });
scheduleSchema.index({ walletAddress: 1, registeredAt: 1 });

// Add a virtual getter for scheduleId that returns the _id as a string
// This helps maintain backward compatibility with existing code
scheduleSchema.virtual('scheduleId').get(function() {
  return this._id.toString();
});

// Ensure virtuals are included when converting to JSON
scheduleSchema.set('toJSON', { virtuals: true });
scheduleSchema.set('toObject', { virtuals: true });

export const Schedule = mongoose.model('Schedule', scheduleSchema);
