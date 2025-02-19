import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, unique: true, required: true },
  purchaseIntervalMinutes: { type: Number, required: true },
});

const purchasedCoinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coinAddress: { type: String, required: true },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true },
  priceAtPurchase: { type: Number, required: true },
  txHash: { type: String, unique: true, required: true },
  purchasedAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
export const PurchasedCoin = mongoose.model(
  'PurchasedCoin',
  purchasedCoinSchema
);
