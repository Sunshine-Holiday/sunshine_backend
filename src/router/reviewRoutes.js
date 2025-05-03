// routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  deleteReview,
  getReviewByBookingId,
  getReviewById,
  getReviewsByTripAndDate,
  getTripReviews,
  updateReviewStatus,
} from "../controller/reviewController.js";

import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Submit review after trip
router.post("/", isAuthenticated, createReview);

// Get all reviews for a trip
router.get("/:tripId", getTripReviews);
router.get("/review/:bookingId", getReviewByBookingId);

router.get(
  "/:tripId/date/:selectedDate",
  isAuthenticated,
  adminOnly,
  getReviewsByTripAndDate
);

// Get a single review by ID
router.get("/:reviewId", isAuthenticated, adminOnly, getReviewById);

// Update review status (approve/disapprove) (Admin only)
router.patch("/:reviewId/status", adminOnly, updateReviewStatus);

// Delete a review (Admin or review owner)
router.delete("/:reviewId", isAuthenticated, deleteReview);
export default router;
