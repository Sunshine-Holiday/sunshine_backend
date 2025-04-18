// routes/reviewRoutes.js
import express from "express";
import { createReview, getTripReviews } from "../controller/reviewController.js";

import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Submit review after trip
router.post("/", isAuthenticated, createReview);

// Get all reviews for a trip
router.get("/:tripId", getTripReviews);

export default router;
