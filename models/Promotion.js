const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // Unique promo code
    discountType: { type: String, enum: ['percentage', 'flat'], required: true }, // Type of discount
    discountValue: { type: Number, required: true }, // Discount value
    expirationDate: { type: Date }, // When the promo code expires
    usageLimit: { type: Number, default: 0 }, // How many times it can be used
    usedCount: { type: Number, default: 0 }, // Tracks how many times it's been used
    applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], // Services to which the promo is applied
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
