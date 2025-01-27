import express from "express";
import {
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingById,
  getAllBookings,
  getAllBookingsByUserId,
} from "../controller/booking.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.get("/user", isAuthenticated, getAllBookingsByUserId);
// Create a new booking
router.post("/",isAuthenticated, createBooking);
router.get("/",isAuthenticated,adminOnly, getAllBookings);
// Update an existing booking
router.put("/:id",isAuthenticated,adminOnly, updateBooking);

// Delete a booking
router.delete("/:id", isAuthenticated,adminOnly,deleteBooking);

// Get a booking by its id
router.get("/:id", isAuthenticated,adminOnly, getBookingById);
export default router;
