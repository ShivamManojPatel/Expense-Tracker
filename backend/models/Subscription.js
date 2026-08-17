const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: 'Subscription' },
    billingCycle: {
      type: String,
      enum: ['Weekly', 'Monthly', 'Yearly'],
      default: 'Monthly'
    },
    // Day of month (1-31) the subscription bills on, used to render the calendar
    billingDay: { type: Number, required: true, min: 1, max: 31 },
    startDate: { type: Date, required: true, default: Date.now },
    active: { type: Boolean, default: true },
    notes: { type: String, trim: true, default: '' },
    lastPaidDate: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
