const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#378ADD' },
    icon: { type: String, default: 'ti-tag' },
    appliesTo: { type: String, enum: ['expense', 'income', 'both'], default: 'both' }
  },
  { timestamps: true }
);

categorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
