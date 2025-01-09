const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String }, // New field
    icon: { type: String }, // New field
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt`
);

module.exports = mongoose.model('Category', categorySchema);