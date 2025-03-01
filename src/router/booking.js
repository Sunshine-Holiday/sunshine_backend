import express from "express";
import {
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingById,
  getAllBookings,
  getAllBookingsByUserId,
  getTripBookingStats,
  getBookingsByTrip,
  getTripBookingHistory,
} from "../controller/booking.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();



router.get("/user", isAuthenticated, getAllBookingsByUserId);
// Admin-only booking operations
router.get("/", isAuthenticated, adminOnly, getAllBookings);
router.put("/:id", isAuthenticated, adminOnly, updateBooking);
router.delete("/:id", isAuthenticated, adminOnly, deleteBooking);

// Retrieve booking details
router.get("/:id", isAuthenticated, getBookingById);
router.get("/trip/:tripId", getBookingsByTrip);
router.get("/stats/:tripId", getTripBookingStats);
router.get("/history/:id/:date", getTripBookingHistory);
// User-specific bookings

// Create a new booking
router.post("/", isAuthenticated, createBooking);

export default router;