import express from "express";
import {
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingById,
} from "../controller/booking.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Create a new booking
router.post("/",isAuthenticated, createBooking);

// Update an existing booking
router.put("/:bookingId",isAuthenticated,adminOnly, updateBooking);

// Delete a booking
router.delete("/:bookingId", isAuthenticated,adminOnly,deleteBooking);

// Get a booking by its id
router.get("/:bookingId", isAuthenticated,adminOnly, getBookingById);

export default router;
