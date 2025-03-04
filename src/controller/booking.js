import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";
import User from "../model/userModel.js";
import { sendMail } from "../utils/sendOTP.js";
import { generateBookingConfirmationHTML } from "../utils/userUtils.js";

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
    
    console.log("Booking created successfully",user.email);
  const htmlContent = generateBookingConfirmationHTML(newBooking, user);
    await sendMail({
      email: user.email,
      subject: "Booking Confirmation",
      html: htmlContent,
    
    });
    await sendMail({
      email: "sunshineholidaypackages48@gmail.com",
      subject: "Booking Confirmation",
      html: htmlContent,
    
    });
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
      console.log("hello");
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
      console.log("hello");
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
    const { id } = req.params;

    // Find the booking by id and populate trip and user details
    const booking = await Booking.findById(id)
      .populate("trip")
      .populate("user");

    if (!booking) {
      console.log("hello ss");
      return res.status(404).json({ message: "Booking not found" });
    }
    // console.log(booking)
    return res.status(200).json({ booking });
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

    // Fetch the bookings with applied filter (if any), and sort by descending order of selectedDate
    const bookings = await Booking.find(query)
      .populate("trip") // populate trip details
      .populate("user") // populate user details
      .sort({ createdAt: -1 }) // Sort in descending order
      .exec();

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({ message: "No bookings found", bookings });
    }

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
      .sort({ createdAt: -1 })
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// export const getTripBookingStats = async (req, res) => {
//   try {
//     const { tripId } = req.params;

//     if (!tripId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Trip ID is required'
//       });
//     }

//     // Get all bookings for this trip
//     const bookings = await Booking.find({ trip: tripId });

//     // Get unique users
//     const uniqueUserIds = [...new Set(bookings.map(booking => booking.user.toString()))];

//     // Calculate total number of passengers across all bookings
//     const totalPassengers = bookings.reduce((total, booking) =>
//       total + booking.passengers.length, 0);

//     // Calculate total number of seats booked
//     const totalSeatsBooked = bookings.reduce((total, booking) =>
//       total + booking.selectedSeats.length, 0);

//     return res.status(200).json({
//       success: true,
//       stats: {
//         uniqueUsers: uniqueUserIds.length,
//         totalBookings: bookings.length,
//         totalPassengers,
//         totalSeatsBooked
//       },
//       message: `${uniqueUserIds.length} users have made ${bookings.length} bookings for this trip`
//     });
//   } catch (error) {
//     console.error('Error getting trip booking statistics:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to get trip booking statistics',
//       error: error.message
//     });
//   }
// };

// Get bookings by trip ID

export const getBookingsByTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!tripId) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const bookings = await Booking.find({ trip: tripId })
      .populate("user")
      .populate("trip");

    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// Get trip booking statistics

export const getTripBookingStats = async (req, res) => {
  try {
    const { tripId } = req.params;
    console.log(tripId);
    if (!tripId) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const bookings = await Booking.find({ trip: tripId });

    if (!bookings.length) {
      return res
        .status(404)
        .json({ success: false, message: "No bookings found for this trip" });
    }

    const uniqueUserIds = [
      ...new Set(bookings.map((booking) => booking.user.toString())),
    ];
    const totalPassengers = bookings.reduce(
      (total, booking) => total + booking.passengers.length,
      0
    );
    const totalSeatsBooked = bookings.reduce(
      (total, booking) => total + booking.selectedSeats.length,
      0
    );

    // Group bookings by date with +1 day
    const dailyStats = bookings.reduce((acc, booking) => {
      // Create a new date object and add 1 day
      const nextDay = new Date(booking.selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Format the date to YYYY-MM-DD
      const date = nextDay.toISOString().split("T")[0];
      
      if (!acc[date]) {
        acc[date] = {
          totalBookings: 0,
          totalPassengers: 0,
          totalSeatsBooked: 0,
        };
      }
      acc[date].totalBookings += 1;
      acc[date].totalPassengers += booking.passengers.length;
      acc[date].totalSeatsBooked += booking.selectedSeats.length;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      stats: {
        uniqueUsers: uniqueUserIds.length,
        totalBookings: bookings.length,
        totalPassengers,
        totalSeatsBooked,
        dailyStats, // Booking stats per day (shifted forward by 1 day)
      },
      message: `${uniqueUserIds.length} users have made ${bookings.length} bookings for this trip`,
    });
  } catch (error) {
    console.error("Error getting trip booking statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get trip booking statistics",
      error: error.message,
    });
  }
};
export const getTripBookingHistory = async (req, res) => {
  try {
    const { id, date } = req.params; // Get trip ID and selected date from params

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }
    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });
    }

    // Convert date param to a Date object and normalize it
    const inputDate = date; // Given input
    const timePart = "T18:30:00.000+00:00"; // Fixed time format
    const formattedDate = `${inputDate}${timePart}`;
    const selectedDate = formattedDate;
    const dateObj = new Date(selectedDate);
    dateObj.setDate(dateObj.getDate() - 1);
    const result = dateObj.toISOString().replace('Z', '+00:00');
    console.log(selectedDate);
    console.log(result);
    const dataDate = result;

    // console.log(selectedDate,"");
    // Find any booking that matches the trip ID and date
    const booking = await Booking.findOne({ trip: id, selectedDate: dataDate })
      .populate("trip")
      .populate("user");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "No bookings found for this date" });
    }

    // Fetch all bookings for the same trip on the selected date
    const tripBookings = await Booking.find({
      trip: id,
      selectedDate: dataDate,
    }).populate("user");

    // Construct purchase history details
    const purchaseHistory = tripBookings.map((booking) => ({
      bookingId: booking._id,
      user: {
        id: booking.user._id,
        name: booking.user.name,
        email: booking.user.email,
      },
      totalPassengers: booking.passengers.length,
      selectedSeats: booking.selectedSeats,
      price: booking.price,
    }));

    return res.status(200).json({
      success: true,
      tripDetails: {
        tripId: booking.trip._id,
        tripName: booking.trip.name,
        tripDestination: booking.trip.destination,
        tripDate: booking.trip.date,
      },
      selectedDate: date,
      purchaseHistory, // List of all bookings on the selected date
      message: `Purchase history for trip ID ${booking.trip._id} on ${date} retrieved successfully.`,
    });
  } catch (error) {
    console.error("Error getting trip booking history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get trip booking history",
      error: error.message,
    });
  }
};

export const getTripBookingStatsOfTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { selectedDate: querySelectedDate } = req.query;

    if (!tripId) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const filter = { trip: tripId };

    // Handle date filtering if provided
    if (querySelectedDate) {
      // Format the date with the fixed time part
      const timePart = "T18:30:00.000+00:00";
      const formattedDate = `${querySelectedDate}${timePart}`;

      // Use the formatted date string for exact matching
      filter.selectedDate = new Date(formattedDate);
    }

    const bookings = await Booking.find(filter);

    if (!bookings.length) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for this trip and date",
      });
    }

    // Calculate booking statistics
    const uniqueUserIds = [
      ...new Set(bookings.map((booking) => booking.user.toString())),
    ];

    const totalPassengers = bookings.reduce(
      (total, booking) => total + booking.passengers.length,
      0
    );

    const totalSeatsBooked = bookings.reduce(
      (total, booking) => total + booking.selectedSeats.length,
      0
    );

    // Get all selected seats across bookings
    const allSelectedSeats = bookings.flatMap(
      (booking) => booking.selectedSeats
    );

    return res.status(200).json({
      success: true,
      stats: {
        uniqueUsers: uniqueUserIds.length,
        totalBookings: bookings.length,
        totalPassengers,
        totalSeatsBooked,
      },
      selectedSeats: allSelectedSeats,
      selectedDate: querySelectedDate ? querySelectedDate : "all dates",
      message: `For trip ${tripId} on ${
        querySelectedDate || "all dates"
      }: ${totalSeatsBooked} seats booked`,
    });
  } catch (error) {
    console.error("Error getting trip booking statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get trip booking statistics",
      error: error.message,
    });
  }
};
