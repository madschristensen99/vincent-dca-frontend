import mongoose from 'mongoose';

const purchasedCoinSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coinAddress: { type: String, required: true },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true },
  priceAtPurchase: { type: Number, required: true },
  txHash: { type: String, unique: true, required: true },
  purchasedAt: { type: Date, default: Date.now },
});

export const PurchasedCoin = mongoose.model(
  'PurchasedCoin',
  purchasedCoinSchema
);
