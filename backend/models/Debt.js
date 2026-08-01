const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    person: { type: String, required: true, trim: true },
    type: { type: String, enum: ['borrowed', 'repaid'], required: true },
    amount: { type: Number, required: true, min: 0 },
    remarks: { type: String, trim: true, default: '' },
    date: { type: Date, required: true, default: Date.now }
  },
  { timestamps: true }
);

debtSchema.index({ user: 1, person: 1 });
debtSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Debt', debtSchema);