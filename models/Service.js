const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    price: { type: Number, required: true },
    availability: {
      type: String,
      enum: ["Available", "Unavailable"],
      required: true,
    }, // New field
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: [{ type: String }],
    averageRating: { type: Number, default: 0 }, // New field for average rating
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);