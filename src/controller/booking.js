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
  const { tripId, userId, price, passengers, selectedDate, selectedSeats } =
    fields;

  //   console.log({ tripId, userId, price, passengers, selectedDate, selectedSeats })
  if (passengers?.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (
    !tripId ||
    !userId ||
    !price ||
    !passengers ||
    !selectedDate ||
    !selectedSeats
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { tripId, price, passengers, selectedDate, selectedSeats } = req.body;
    const userId = req.user._id;
    // Check for required fields
    // console.log(req.body)
    const missingFieldsError = checkRequiredFields(
      { tripId, userId, price, passengers, selectedDate, selectedSeats },
      res
    );
    if (missingFieldsError) return missingFieldsError;

    // Validate trip and user
    const trip = await validateTrip(tripId, res);
    if (!trip) return; // Exit if trip is not found

    const user = req.user;
    console.log(user);

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
    const { tripId, userId, price, passengers, selectedDate, selectedSeats } =
      req.body;
    // console.log(req.body)
    // Check for required fields
    const missingFieldsError = checkRequiredFields(
      { tripId, userId, price, passengers, selectedDate, selectedSeats },
      res
    );
    if (missingFieldsError) return missingFieldsError;

    // Find the booking by id
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.log("hello")
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
      console.log("hello")
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
      console.log("hello ss")
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};
// Updated getAllBookings function with corrected date filter logic
export const getAllBookings = async (req, res) => {
  try {
    // Destructure the filter parameter from the query string
    const { filter } = req.query;
    console.log(filter);

    // Prepare the query object
    let query = {};

    // Get the current date in UTC for consistent comparison
    const currentDate = new Date();

    // Handle different filter types
    if (filter === "today") {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0); // Set to start of today (00:00:00)
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999); // Set to end of today (23:59:59)
      query.selectedDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === "yesterday") {
      const startOfYesterday = new Date(currentDate);
      startOfYesterday.setDate(currentDate.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0); // Set to start of yesterday (00:00:00)
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setHours(23, 59, 59, 999); // Set to end of yesterday (23:59:59)
      query.selectedDate = { $gte: startOfYesterday, $lte: endOfYesterday };
    } else if (filter === "tomorrow") {
      const startOfTomorrow = new Date(currentDate);
      startOfTomorrow.setDate(currentDate.getDate() + 1);
      startOfTomorrow.setHours(0, 0, 0, 0); // Set to start of tomorrow (00:00:00)
      const endOfTomorrow = new Date(startOfTomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999); // Set to end of tomorrow (23:59:59)
      query.selectedDate = { $gte: startOfTomorrow, $lte: endOfTomorrow };
    } else if (filter === "next") {
      const startOfNextDay = new Date(currentDate);
      startOfNextDay.setDate(currentDate.getDate() + 1);
      startOfNextDay.setHours(0, 0, 0, 0); // Set to start of next day (00:00:00)
      query.selectedDate = { $gte: startOfNextDay };
    }

    // Fetch the bookings with applied filter (if any)
    const bookings = await Booking.find(query)
      .populate("trip") // populate trip details
      .populate("user") // populate user details
      .exec();

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No bookings found", bookings });
    }
    console.log(bookings);

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

export const getAllBookingsByUserId = async (req, res) => {
  const { _id } = req.user; // Extract the user ID from the route params
  console.log("id is required", req.user);
  if (!_id) {
    return res.status(401).json({ message: "id is required to get access" });
  }
  try {
    // Fetch all bookings for the given user ID and populate related fields
    const bookings = await Booking.find({ user: _id })
      .populate("trip") // populate trip details
      .populate("user") // populate user details
      .exec();

    if (!bookings || bookings.length === 0) {
      return res
        .status(404)
        .json({ message: "No bookings found for this user." });
    }

    // Return the list of bookings
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch bookings",
        error: error.message,
      });
  }
};
