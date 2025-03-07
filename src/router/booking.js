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
  getTripBookingStatsOfTrip,
  processRefund,
  requestRefund,
  getProcessingBookings,
} from "../controller/booking.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/user", isAuthenticated, getAllBookingsByUserId);
// Admin-only booking operations
router.get("/", isAuthenticated, adminOnly, getAllBookings);
router.put("/:id", isAuthenticated, adminOnly, updateBooking);
router.delete("/:id", isAuthenticated, adminOnly, deleteBooking);
router.get("/process", isAuthenticated, adminOnly, getProcessingBookings);
// Retrieve booking details
router.get("/:id", isAuthenticated, getBookingById);
router.get("/trip/:tripId", getBookingsByTrip);
router.get("/stats/:tripId", getTripBookingStats);
router.get("/history/:id/:date", getTripBookingHistory);
// User-specific bookings
router.get(
  "/stats/trip-date/:tripId",
  isAuthenticated,
  getTripBookingStatsOfTrip
);
// Create a new booking
router.post("/", isAuthenticated, createBooking);
router.post("/request", isAuthenticated, requestRefund);

// Admin routes
router.post("/process", isAuthenticated, adminOnly, processRefund);

export default router;
