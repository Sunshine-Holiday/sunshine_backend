// routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  deleteReview,
  getReviewByBookingId,
  getReviewById,
  getReviewsByTripAndDate,
  getTripReviews,
  updateBooking,
  updateReview,
  updateReviewStatus,
} from "../controller/reviewController.js";

import { adminOnly, isAuthenticated } from "../middleware/auth.js";


const router = express.Router();
router.use(isAuthenticated)
// Submit review after trip
router.post("/", createReview);

// Get all reviews for a trip
router.get("/:tripId", getTripReviews);
router.get("/review/:bookingId", getReviewByBookingId);

router.get(
  "/:tripId/date/:selectedDate",
  adminOnly,
  getReviewsByTripAndDate
);

// Get a single review by ID
router.get("/:reviewId", adminOnly, getReviewById);

// Update review status (approve/disapprove) (Admin only)
router.put("/:reviewId", adminOnly, updateReview);
router.put("/bookings/:bookingId", adminOnly, updateBooking);
router.patch("/:reviewId/status", adminOnly, updateReviewStatus);

// Delete a review (Admin or review owner)
router.delete("/:reviewId", deleteReview);
export default router;
