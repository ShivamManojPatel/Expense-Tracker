const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['expense', 'income', 'saving_deposit', 'saving_withdrawal'],
      default: 'expense'
    },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'],
      default: 'Card'
    },
    date: { type: Date, required: true, default: Date.now },
    isSplit: { type: Boolean, default: false },
    totalAmount: { type: Number, min: 0 },
    splitWith: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, tags: 1 });
expenseSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Expense', expenseSchema);