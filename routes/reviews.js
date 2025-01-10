const express = require("express");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/authMiddleware");
const { reviewUpload, cloudinary } = require("../utils/uploadConfig");
const router = express.Router();

// Add a review for a service
router.post(
  "/",
  authMiddleware,
  reviewUpload.array("images", 5),
  async (req, res) => {
    const { service, rating, comment } = req.body;

    try {
      // Process uploaded images if any
      const imageUrls = req.files ? req.files.map((file) => file.path) : [];

      const newReview = new Review({
        user: req.user.id,
        service,
        rating,
        comment,
        images: imageUrls,
      });

      await newReview.save();
      res.status(201).json(newReview);
    } catch (err) {
      // Delete uploaded images if review creation fails
      if (req.files) {
        for (const file of req.files) {
          const publicId = file.filename;
          await cloudinary.uploader.destroy(publicId);
        }
      }
      res.status(400).json({ message: err.message });
    }
  }
);

// Get reviews for a service
router.get("/:serviceId", async (req, res) => {
  try {
    const reviews = await Review.find({
      service: req.params.serviceId,
    }).populate("user", "name");
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Review
router.put('/:id', authMiddleware, reviewUpload.array('images', 5), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Ensure only the review author can update
    if (req.user.id !== review.user.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = req.body;
    
    // Handle image deletions if specified
    if (req.body.deletedImages) {
      const deletedImages = JSON.parse(req.body.deletedImages);
      
      // Delete images from Cloudinary
      for (const imageUrl of deletedImages) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
      
      // Remove deleted images from the review
      review.images = review.images.filter(img => !deletedImages.includes(img));
    }

    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => file.path);
      review.images = [...review.images, ...newImageUrls];
    }

    // Update other fields
    review.rating = updates.rating || review.rating;
    review.comment = updates.comment || review.comment;

    const updatedReview = await review.save();
    res.json(updatedReview);
  } catch (err) {
    // Delete newly uploaded images if update fails
    if (req.files) {
      for (const file of req.files) {
        const publicId = file.filename;
        await cloudinary.uploader.destroy(publicId);
      }
    }
    res.status(500).json({ error: err.message });
  }
});

// Modified delete route to clean up images
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Ensure only the review author or an admin can delete the review
    if (req.user.id !== review.user.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete all images from Cloudinary
    for (const imageUrl of review.images) {
      const publicId = imageUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // Delete the review
    await review.deleteOne();
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
