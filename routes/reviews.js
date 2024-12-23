const express = require('express');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Add a review for a service
router.post('/', authMiddleware, async (req, res) => {
  const { service, rating, comment } = req.body;

  try {
    const newReview = new Review({ user: req.user.id, service, rating, comment });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get reviews for a service
router.get('/:serviceId', async (req, res) => {
  try {
    const reviews = await Review.find({ service: req.params.serviceId }).populate('user', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Review
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Ensure only the review author can update
    if (req.user.id !== review.user.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(updatedReview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;