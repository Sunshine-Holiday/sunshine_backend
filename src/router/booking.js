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
  updateBookingSeats,
  deleteBookingSeats,
  getDayWiseBookings,
} from "../controller/booking.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// ================= REPORTS (STATIC FIRST) =================
router.get("/day-wise", isAuthenticated, adminOnly, getDayWiseBookings);
router.get("/process", isAuthenticated, adminOnly, getProcessingBookings);

// ================= USER =================
router.get("/user", isAuthenticated, getAllBookingsByUserId);

// ================= TRIP =================
router.get("/trip/:tripId", getBookingsByTrip);
router.get("/stats/:tripId", isAuthenticated, adminOnly, getTripBookingStats);
router.get("/stats/trip-date/:tripId", isAuthenticated, getTripBookingStatsOfTrip);
router.get("/history/:id/:date", getTripBookingHistory);

// ================= CRUD =================
router.get("/", isAuthenticated, adminOnly, getAllBookings);
router.post("/", createBooking);
router.put("/:id", isAuthenticated, adminOnly, updateBooking);
router.delete("/:id", isAuthenticated, adminOnly, deleteBooking);

// ================= REFUND =================
router.post("/request", isAuthenticated, requestRefund);
router.post("/process", isAuthenticated, adminOnly, processRefund);

// ================= SEATS =================
router.put("/update/:bookingId", isAuthenticated, updateBookingSeats);
router.delete("/delete/:bookingId", isAuthenticated, deleteBookingSeats);

// ❗❗ MUST BE ABSOLUTELY LAST ❗❗
router.get("/:id", isAuthenticated, getBookingById);

export default router;
