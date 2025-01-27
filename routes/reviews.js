//routes/reviews.js
const express = require("express");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/authMiddleware");
const { reviewUpload, cloudinary } = require("../utils/uploadConfig");
const router = express.Router();

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'File too large. Maximum size is 10MB'
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      message: 'Too many files. Maximum is 5 images'
    });
  }
  next(err);
};

// Add a review for a service
router.post(
  "/",
  authMiddleware,
  (req, res, next) => {
    console.log('Raw request body:', req.body);
    console.log('Files:', req.files);
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
  (req, res, next) => {
    console.log('Review post request received:', {
      userId: req.user?.id,
      body: req.body,
      files: req.files ? 'Files present' : 'No files'
    });
    next();
  },
  reviewUpload.array("images", 5),
  handleMulterError,
  async (req, res) => {
    console.log('Processing review with uploaded files:', {
      body: req.body,
      filesCount: req.files?.length || 0
    });

    const { service, rating, comment } = req.body;

    if (!service || !rating) {
      return res.status(400).json({
        message: 'Service and rating are required'
      });
    }

    try {
      // Process images first
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        console.log('Processing uploaded files...');
        imageUrls = req.files.map(file => {
          console.log('File path:', file.path);
          return file.path;
        });
      }

      // Create the review document
      const reviewData = {
        user: req.user.id,
        service,
        rating: Number(rating),
        comment: comment || '',
        images: imageUrls,
      };

      console.log('Creating review with data:', reviewData);

      const newReview = new Review(reviewData);
      const savedReview = await newReview.save();
      
      console.log('Review saved successfully:', savedReview._id);

      // Populate and return
      const populatedReview = await Review.findById(savedReview._id)
        .populate("user", "name")
        .lean();

      console.log('Sending populated review response');
      res.status(201).json(populatedReview);
    } catch (err) {
      console.error('Error in review creation:', {
        error: err.message,
        stack: err.stack
      });

      // Cleanup uploaded images if review creation fails
      if (req.files && req.files.length > 0) {
        try {
          await Promise.all(
            req.files.map(file => {
              if (file.path) {
                const publicId = file.path.split('/').pop().split('.')[0];
                return cloudinary.uploader.destroy(publicId);
              }
            })
          );
        } catch (cleanupErr) {
          console.error('Error cleaning up images:', cleanupErr);
        }
      }

      res.status(500).json({
        message: 'Failed to create review',
        error: err.message
      });
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

// Update Review with improved image handling
router.put('/:id', authMiddleware, reviewUpload.array('images', 5), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (req.user.id !== review.user.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Handle image deletions first
    if (req.body.deletedImages) {
      const deletedImages = JSON.parse(req.body.deletedImages);
      
      // Delete images from Cloudinary
      await Promise.allSettled(
        deletedImages.map(async (imageUrl) => {
          const publicId = imageUrl.split('/').pop().split('.')[0];
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        })
      );
      
      review.images = review.images.filter(img => !deletedImages.includes(img));
    }

    // Process new images
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = req.files.map(file => {
        if (!file.path) {
          throw new Error('Image upload failed - URL not available');
        }
        return file.path;
      });
    }

    // Update review with new data
    review.rating = req.body.rating || review.rating;
    review.comment = req.body.comment || review.comment;
    review.images = [...review.images, ...newImageUrls];

    const updatedReview = await review.save();
    const populatedReview = await Review.findById(updatedReview._id)
      .populate("user", "name")
      .lean();

    res.json(populatedReview);
  } catch (err) {
    console.error('Error updating review:', err);
    
    // Clean up any newly uploaded images if the update fails
    if (req.files && req.files.length > 0) {
      await Promise.allSettled(
        req.files.map(async (file) => {
          if (file.path) {
            const publicId = file.path.split('/').pop().split('.')[0];
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (deleteErr) {
              console.error('Error deleting uploaded image:', deleteErr);
            }
          }
        })
      );
    }

    res.status(500).json({ 
      message: 'Failed to update review',
      error: err.message 
    });
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
