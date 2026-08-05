require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const result = await Category.updateMany(
    { appliesTo: { $exists: false } },
    { $set: { appliesTo: 'both' } }
  );

  console.log(`Backfilled appliesTo on ${result.modifiedCount} categor${result.modifiedCount === 1 ? 'y' : 'ies'}.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});