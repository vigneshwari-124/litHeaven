const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  balance: {
    type: Number,
    default: 0
  },

  transactions: [
    {
      transactionId: {
        type: String,
        required: true
      },

      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
      },

      amount: {
        type: Number,
        required: true
      },

      reason: {
        type: String,
        enum: ['topup', 'refund', 'purchase', 'referral_bonus'],
        required: true
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);