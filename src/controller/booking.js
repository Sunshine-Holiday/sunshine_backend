import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";
import User from "../model/userModel.js";

// Helper function to validate trip existence
const validateTrip = async (tripId, res) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    return res.status(404).json({ message: "Trip not found" });
  }
  return trip;
};

// Helper function to validate user existence
const validateUser = async (userId, res) => {
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return user;
};

// Helper function to check required fields
const checkRequiredFields = (fields, res) => {
  const { tripId, userId, price, passengers, selectedDate, selectedSeats } = fields;

//   console.log({ tripId, userId, price, passengers, selectedDate, selectedSeats })
  if (passengers.length===0) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!tripId || !userId || !price || !passengers || !selectedDate || !selectedSeats) {
    return res.status(400).json({ message: "Missing required fields" });
  }
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { tripId, price, passengers, selectedDate, selectedSeats } = req.body;
const userId=req.user._id
    // Check for required fields
    const missingFieldsError = checkRequiredFields({ tripId, userId, price, passengers, selectedDate, selectedSeats }, res);
    if (missingFieldsError) return missingFieldsError;

    // Validate trip and user
    const trip = await validateTrip(tripId, res);
    if (!trip) return; // Exit if trip is not found

    const user = req.user
    console.log(user)

    // Create the booking
    const newBooking = new Booking({
      trip: tripId,
      user: userId,
      price,
      passengers,
      selectedDate,
      selectedSeats,
    });

    // Save the booking
    await newBooking.save();
    return res.status(201).json(newBooking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Update an existing booking
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tripId, userId, price, passengers, selectedDate, selectedSeats } = req.body;

    // Check for required fields
    const missingFieldsError = checkRequiredFields({ tripId, userId, price, passengers, selectedDate, selectedSeats }, res);
    if (missingFieldsError) return missingFieldsError;

    // Find the booking by id
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Validate trip and user
    const trip = tripId ? await validateTrip(tripId, res) : booking.trip;
    if (!trip) return; // Exit if trip is not found

    const user = userId ? await validateUser(userId, res) : booking.user;
    if (!user) return; // Exit if user is not found

    // Update booking details
    booking.trip = tripId || booking.trip;
    booking.user = userId || booking.user;
    booking.price = price || booking.price;
    booking.passengers = passengers || booking.passengers;
    booking.selectedDate = selectedDate || booking.selectedDate;
    booking.selectedSeats = selectedSeats || booking.selectedSeats;

    // Save the updated booking
    await booking.save();
    return res.status(200).json(booking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Delete a booking by its id
export const deleteBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find and delete the booking
    const booking = await Booking.findByIdAndDelete(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get a booking by its id
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the booking by id and populate trip and user details
    const booking = await Booking.findById(bookingId)
      .populate("trip")
      .populate("user");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};
