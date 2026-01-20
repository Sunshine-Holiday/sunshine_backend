import mongoose from "mongoose";
import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";
import User from "../model/userModel.js";
import { sendMail } from "../utils/sendOTP.js";
import {
  generateBookingConfirmationHTML,
  generateRefundProcessedHTML,
  generateRefundRequestHTML,
} from "../utils/userUtils.js";

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
  const { tripId, userId, price, selectedDate, selectedSeats } = fields;

  //   console.log({ tripId, userId, price, passengers, selectedDate, selectedSeats })

  if (!tripId || !price || !selectedDate || !selectedSeats) {
    return res.status(400).json({ message: "Missing required fields" });
  }
};

// Create a new booking



/**
 * CREATE BOOKING CONTROLLER
 */
export const createBooking = async (req, res) => {
  try {
    const {
      tripId,
      selectedPackage,
      selectedRoomChoice,
      roomCount = 0,
      price,
      advancePaid = 0,
      selectedDate,
      passengers,
      selectedSeats,
      isadminBooking = false,
    } = req.body;

    console.log("Create Booking Request Body:", req.body);

    // ---------------------------
    // 🔴 REQUIRED FIELD CHECK
    // ---------------------------
    if (
      !tripId ||
      price === undefined ||
      !selectedDate ||
      !Array.isArray(passengers) ||
      !Array.isArray(selectedSeats)
    ) {
      return res.status(400).json({
        message: "Missing required booking fields",
      });
    }

    // ---------------------------
    // 📅 DATE FORMAT VALIDATION (EARLY)
    // ---------------------------
    if (!/^\d{2}-\d{2}-\d{4}$/.test(selectedDate)) {
      return res.status(400).json({
        message: "Selected date must be DD-MM-YYYY",
      });
    }

    // ---------------------------
    // 🧭 VALIDATE TRIP
    // ---------------------------
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ---------------------------
    // 📦 PACKAGE / ROOM VALIDATION
    // ---------------------------
    if (selectedPackage && !mongoose.Types.ObjectId.isValid(selectedPackage)) {
      return res.status(400).json({ message: "Invalid package ID" });
    }

    if (
      selectedRoomChoice &&
      !mongoose.Types.ObjectId.isValid(selectedRoomChoice)
    ) {
      return res.status(400).json({ message: "Invalid room choice ID" });
    }

    if (selectedRoomChoice) {
      const minRooms = Math.ceil(passengers.length / 2);
      if (!roomCount || roomCount < minRooms) {
        return res.status(400).json({
          message: `Room count must be at least ${minRooms}`,
        });
      }
    } else if (roomCount > 0) {
      return res.status(400).json({
        message: "Room count provided without selecting a room",
      });
    }

    // ---------------------------
    // 👤 PASSENGER VALIDATION
    // ---------------------------
    const validPassengers = passengers.every(
      (p) =>
        p.name &&
        p.age &&
        ["male", "female", "other"].includes(p.gender) &&
        ["aadhar", "pan"].includes(p.idProof) &&
        p.idProofNumber &&
        p.phoneNumber &&
        p.email &&
        /^\S+@\S+\.\S+$/.test(p.email)
    );

    if (!validPassengers) {
      return res.status(400).json({
        message: "Invalid passenger details",
      });
    }

    // ---------------------------
    // 🪑 SEAT VALIDATION
    // ---------------------------
    if (selectedSeats.length === 0) {
      return res.status(400).json({
        message: "At least one seat is required",
      });
    }

    if (selectedSeats.length !== passengers.length) {
      return res.status(400).json({
        message: "Number of seats must match number of passengers",
      });
    }

    const seatsAreValid = selectedSeats.every(
      (s) =>
        typeof s === "object" &&
        typeof s.seat === "string" &&
        typeof s.busIndex === "number" &&
        s.busIndex >= 0
    );

    if (!seatsAreValid) {
      return res.status(400).json({
        message: "Each seat must contain seat and busIndex",
      });
    }

    // ---------------------------
    // 🔒 PREVENT DOUBLE BOOKING
    // ---------------------------
    const seatConflicts = await Booking.findOne({
      trip: tripId,
      selectedDate,
      selectedSeats: {
        $elemMatch: {
          $or: selectedSeats.map((s) => ({
            seat: s.seat,
            busIndex: s.busIndex,
          })),
        },
      },
    });

    if (seatConflicts) {
      return res.status(400).json({
        message: "One or more selected seats are already booked",
      });
    }

    // ---------------------------
    // 💰 PAYMENT VALIDATION
    // ---------------------------
    if (price < 0 || advancePaid < 0) {
      return res.status(400).json({
        message: "Price values cannot be negative",
      });
    }

    if (advancePaid > price) {
      return res.status(400).json({
        message: "Advance paid cannot exceed total price",
      });
    }

    const remainingBalance = price - advancePaid;

    let paymentStatus = "pending";
    if (advancePaid > 0 && advancePaid < price) paymentStatus = "advance";
    if (advancePaid >= price) paymentStatus = "full";

    // ---------------------------
    // ✅ CREATE BOOKING
    // ---------------------------
    const booking = await Booking.create({
      trip: tripId,
      selectedPackage: selectedPackage || null,
      selectedRoomChoice: selectedRoomChoice || null,
      roomCount,
      price,
      advancePaid,
      remainingBalance,
      paymentStatus,
      passengers,
      selectedSeats,
      selectedDate,
      hasReview: false,
      reviewEnabled: false,
      status: paymentStatus === "pending" ? "pending" : "confirmed",
    });

    // ---------------------------
    // 📩 SEND EMAILS (WITH TRIP DATA)
    // ---------------------------
    if (!isadminBooking) {
      const populatedBooking = await Booking.findById(booking._id).populate(
        "trip"
      );

      const emailPromises = populatedBooking.passengers.map((passenger) =>
        sendMail({
          email: passenger.email,
          subject: "Booking Confirmation",
          html: generateBookingConfirmationHTML(
            populatedBooking,
            passenger
          ),
        })
      );

      // Admin copy
      emailPromises.push(
        sendMail({
          email: "sunshineholidaypackages@gmail.com",
          subject: "New Booking Confirmation",
          html: generateBookingConfirmationHTML(
            populatedBooking,
            populatedBooking.passengers[0]
          ),
        })
      );

      await Promise.all(emailPromises);
    }

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
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
      res,
    );
    if (missingFieldsError) return missingFieldsError;

    // Find the booking by id
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      // console.log("hello");
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
  const { _id } = req.user; // Extract the user ID from the request
  console.log("User ID:", _id);

  if (!_id) {
    return res
      .status(401)
      .json({ message: "User ID is required to get access" });
  }

  try {
    // Fetch all bookings for the given user ID
    const bookings = await Booking.find({ user: _id })
      .populate({
        path: "trip",
        populate: [
          {
            path: "packages",
            select: "title description personCount price",
          },
          {
            path: "roomChoices",
            select: "description personCount roomCount price",
          },
        ],
      })
      .populate({
        path: "user",
        select: "username email phone",
      })
      .sort({ createdAt: -1 })
      .exec();

    // Filter out bookings where trip is null and map selectedPackage/selectedRoomChoice
    const validBookings = bookings
      .filter((booking) => booking.trip !== null)
      .map((booking) => {
        // Transform selectedDate to DD-MM-YYYY string
        const selectedDate = booking.selectedDate
          ? new Date(booking.selectedDate)
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              .split("/")
              .join("-")
          : "N/A";

        // Find the selectedPackage from trip.packages
        const selectedPackage = booking.selectedPackage
          ? booking.trip.packages.find((pkg) =>
              pkg._id.equals(booking.selectedPackage),
            )
          : null;

        // Find the selectedRoomChoice from trip.roomChoices
        const selectedRoomChoice = booking.selectedRoomChoice
          ? booking.trip.roomChoices.find((room) =>
              room._id.equals(booking.selectedRoomChoice),
            )
          : null;

        return {
          ...booking.toObject(),
          selectedDate,
          selectedPackage: selectedPackage
            ? {
                _id: selectedPackage._id,
                title: selectedPackage.title,
                description: selectedPackage.description,
                personCount: selectedPackage.personCount,
                price: selectedPackage.price,
              }
            : null,
          selectedRoomChoice: selectedRoomChoice
            ? {
                _id: selectedRoomChoice._id,
                description: selectedRoomChoice.description,
                personCount: selectedRoomChoice.personCount,
                roomCount: selectedRoomChoice.roomCount,
                price: selectedRoomChoice.price,
              }
            : null,
        };
      });

    // Return the list of valid bookings
    res.status(200).json({
      success: true,
      bookings: validBookings.length > 0 ? validBookings : [],
    });
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

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Trip ID is required" });
    }

    const bookings = await Booking.find({ trip: tripId });

    if (!bookings.length) {
      return res
        .status(404)
        .json({ success: false, message: "No bookings found for this trip" });
    }

    // Calculate total passengers and seats
    const totalPassengers = bookings.reduce(
      (total, booking) => total + booking.passengers.length,
      0,
    );

    const totalSeatsBooked = bookings.reduce((total, booking) => {
      // Handle both numeric seats and "N/A" or "block"
      return (
        total +
        booking.selectedSeats.filter(
          (seat) => seat !== "N/A" && seat !== "block",
        ).length
      );
    }, 0);

    // Group bookings by selectedDate (DD-MM-YYYY)
    const dailyStats = bookings.reduce((acc, booking) => {
      const dateKey = booking.selectedDate; // Already in "DD-MM-YYYY" format

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          totalBookings: 0,
          totalPassengers: 0,
          totalSeatsBooked: 0,
        };
      }

      acc[dateKey].totalBookings += 1;
      acc[dateKey].totalPassengers += booking.passengers.length;

      // Count only actual seat numbers (exclude "N/A" and "block")
      const actualSeats = booking.selectedSeats.filter(
        (seat) => seat !== "N/A" && seat !== "block",
      );
      acc[dateKey].totalSeatsBooked += actualSeats.length;

      return acc;
    }, {});

    // Convert to sorted array (most recent first)
    const sortedDailyStats = Object.values(dailyStats).sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split("-").map(Number);
      const [dayB, monthB, yearB] = b.date.split("-").map(Number);
      return (
        new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA)
      );
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: bookings.length,
        totalPassengers,
        totalSeatsBooked,
        dailyStats: sortedDailyStats,
      },
      message: `${bookings.length} booking(s) found with ${totalPassengers} total passenger(s)`,
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
    const { id, date } = req.params; // tripId and selectedDate (DD-MM-YYYY)

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    if (!date || !/^\d{2}-\d{2}-\d{4}$/.test(date)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid date in DD-MM-YYYY format is required",
        });
    }

    // Find all bookings for this trip on the exact selectedDate
    const tripBookings = await Booking.find({
      trip: id,
      selectedDate: date,
    }).populate("trip"); // Only populate trip, no user

    if (!tripBookings || tripBookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No bookings found for this date" });
    }

    // Get trip details from the first booking (all share the same trip)
    const trip = tripBookings[0].trip;

    // Find the matching startDate to get seat capacity
    const matchingStartDate = trip.startDates.find((sd) => sd.date === date);
    const totalSeatsAvailable = matchingStartDate?.seats || 0;

    // Calculate booked seats (only count numeric seats, ignore "N/A" or "block")
    const bookedSeatsCount = tripBookings.reduce((total, booking) => {
      return (
        total +
        booking.selectedSeats.filter(
          (seat) => seat !== "N/A" && seat !== "block" && /^\d+$/.test(seat),
        ).length
      );
    }, 0);

    // Construct purchase history (guest-friendly)
    const purchaseHistory = tripBookings.map((booking) => ({
      bookingId: booking._id,
      leadPassenger: {
        name: booking.passengers[0]?.name || "Guest",
        phoneNumber: booking.passengers[0]?.phoneNumber || "N/A",
      },
      totalPassengers: booking.passengers.length,
      selectedSeats: booking.selectedSeats,
      price: booking.price,
      advancePaid: booking.advancePaid,
      remainingBalance: booking.remainingBalance,
      paymentStatus: booking.paymentStatus,
      status: booking.status,
      hasReview: booking.hasReview,
      reviewEnabled: booking.reviewEnabled,
      createdAt: booking.createdAt,
    }));

    return res.status(200).json({
      success: true,
      tripDetails: {
        tripId: trip._id,
        tripName: trip.name || trip.location,
        destination: trip.category || trip.location,
        date: date,
        totalSeatsAvailable,
        bookedSeatsCount,
        availableSeats: totalSeatsAvailable - bookedSeatsCount,
      },
      selectedDate: date,
      totalBookings: tripBookings.length,
      totalPassengers: tripBookings.reduce(
        (sum, b) => sum + b.passengers.length,
        0,
      ),
      purchaseHistory,
      message: `${tripBookings.length} booking(s) found for ${date}`,
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

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Trip ID is required",
      });
    }

    const filter = { trip: tripId };

    if (querySelectedDate) {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(querySelectedDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY",
        });
      }
      filter.selectedDate = querySelectedDate;
    }

    const bookings = await Booking.find(filter).populate("trip");

    if (!bookings.length) {
      return res.status(200).json({
        success: true,
        stats: {
          totalBookings: 0,
          totalPassengers: 0,
          totalSeatsBooked: 0,
          availableSeats: 0,
          totalAvailableSeats: 0,
          uniqueCustomers: 0,
        },
        selectedSeatsByBus: {},
        message: "No bookings found",
      });
    }

    /* ---------------------------------- */
    /* 🚌 CORRECT BUS-AWARE SEAT PARSING   */
    /* ---------------------------------- */

    const selectedSeatsByBus = {}; // { busIndex: [seatNo] }
    let totalSeatsBooked = 0;

    bookings.forEach((booking) => {
      booking.selectedSeats.forEach((seatObj) => {
        // Ignore N/A seats
        if (!seatObj || seatObj.seat === "N/A") return;

        const { seat, busIndex } = seatObj;

        if (typeof seat === "string" && typeof busIndex === "number") {
          if (!selectedSeatsByBus[busIndex]) {
            selectedSeatsByBus[busIndex] = [];
          }

          selectedSeatsByBus[busIndex].push(seat);
          totalSeatsBooked++;
        }
      });
    });

    /* ---------------------------------- */
    /* 📊 OTHER STATS                     */
    /* ---------------------------------- */

    const totalPassengers = bookings.reduce(
      (sum, b) => sum + (b.passengers?.length || 0),
      0,
    );

    const uniqueCustomers = new Set(
      bookings.map((b) => b.passengers?.[0]?.phoneNumber).filter(Boolean),
    ).size;

    /* ---------------------------------- */
    /* 🧮 TOTAL CAPACITY                  */
    /* ---------------------------------- */

    let seatsPerBus = 0;
    let numberOfBusesAvailable = 1;

    const trip = bookings[0].trip;

    if (trip?.startDates && querySelectedDate) {
      const matchingDate = trip.startDates.find(
        (sd) => sd.date === querySelectedDate,
      );

      if (matchingDate) {
        seatsPerBus = Number(matchingDate.seats || 0);
        numberOfBusesAvailable = Number(
          matchingDate.numberOfBusesAvailable || 1,
        );
      }
    }

    const totalAvailableSeats = seatsPerBus * numberOfBusesAvailable;
    const availableSeats = totalAvailableSeats - totalSeatsBooked;

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: bookings.length,
        totalPassengers,
        totalSeatsBooked,
        availableSeats,
        totalAvailableSeats,
        uniqueCustomers,
        seatsPerBus,
        numberOfBusesAvailable,
      },
      selectedSeatsByBus,
      selectedDate: querySelectedDate,
      message: "Seat stats fetched successfully",
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

export const requestRefund = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Check if booking belongs to current user
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to request refund for this booking",
      });
    }

    // Check if booking is eligible for refund (not already in refund process)
    if (booking.status === "refund" || booking.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: `Refund already ${
          booking.status === "refund" ? "processing" : "resolved"
        }`,
      });
    }

    // Update booking status to refund
    booking.status = "processing";
    await booking.save();

    // You might want to create a separate refund model to track refund details
    // For now, we'll just update the booking status
    const html = generateRefundRequestHTML(booking, req.user, reason);
    await sendMail({
      email: req.user.email,
      html,
      subject: "Refund Request Confirmation - Sunshine Holiday Packages",
      from: "sunshineholidaypackages@gmail.com",
    });
    await sendMail({
      email: "sunshineholidaypackages@gmail.com",
      html,
      subject: "Refund Request Confirmation - Sunshine Holiday Packages",
      from: "sunshineholidaypackages@gmail.com",
    });
    return res.status(200).json({
      success: true,
      message: "Refund request submitted successfully",
      booking,
    });
  } catch (error) {
    console.error("Error requesting refund:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const processRefund = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Booking ID is required" });
    }

    // Populate the 'user' field to get user data, including email
    const booking = await Booking.findById(bookingId).populate("user");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Update booking status to resolved
    booking.status = "resolved";

    await booking.save();

    const html = generateRefundProcessedHTML(booking, booking.user);
    await sendMail({
      email: booking.user.email, // Access email from populated user
      html,
      subject: "Refund Processed - Sunshine Holiday Packages",
      from: "sunshineholidaypackages@gmail.com",
    });
    await sendMail({
      email: "sunshineholidaypackages@gmail.com",
      html,
      subject: "Refund Processed - Sunshine Holiday Packages",
      from: "sunshineholidaypackages@gmail.com",
    });

    return res.status(200).json({
      success: true,
      message: "Request to cancellation",
      booking,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getProcessingBookings = async (req, res) => {
  try {
    console.log("hello");
    const processingBookings = await Booking.find({ status: "processing" })
      .populate("trip") // Populates trip reference
      .populate("user") // Populates user reference
      .exec();

    return res.status(200).json({
      success: true,
      message: `Request to cancelation`,
      bookings: processingBookings,
    });
  } catch (error) {
    console.error("Error fetching processing bookings:", error);
    // throw error;
  }
};

export const updateBookingSeats = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { oldSeat, newSeat } = req.body;
    console.log(req.body);
    console.log({ oldSeat, newSeat, bookingId });
    // Validate input
    if (!bookingId || !oldSeat || !newSeat) {
      return res.status(400).json({
        success: false,
        message:
          "Booking ID, old seat number, and new seat number are required",
      });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId)
      .populate("trip")
      .populate("user");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if old seat exists in the booking
    const seatIndex = booking.selectedSeats.indexOf(oldSeat);
    if (seatIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Old seat number not found in this booking",
      });
    }

    // Get trip details to validate seat availability
    const trip = booking.trip;
    const totalSeats = trip.totalSeats || 31; // Default to 31 if not specified

    // Validate new seat
    if (parseInt(newSeat) > totalSeats || parseInt(newSeat) < 1) {
      return res.status(400).json({
        success: false,
        message: `New seat number must be between 1 and ${totalSeats}`,
      });
    }

    // Check if new seat is already booked (across all bookings for this trip)
    const conflictingBooking = await Booking.findOne({
      trip: trip._id,
      selectedSeats: newSeat,
      _id: { $ne: bookingId }, // Exclude current booking
      selectedDate: booking.selectedDate,
    });

    if (conflictingBooking) {
      return res.status(400).json({
        success: false,
        message: "New seat number is already booked",
      });
    }

    // Update the seat
    booking.selectedSeats[seatIndex] = newSeat;
    await booking.save();

    // Return updated booking
    return res.status(200).json({
      success: true,
      message: "Seat updated successfully",
      data: {
        bookingId: booking._id,
        oldSeat,
        newSeat,
        selectedSeats: booking.selectedSeats,
      },
    });
  } catch (error) {
    console.error("Error updating booking seats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const deleteBookingSeats = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate input
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    // Find and delete the booking
    const booking = await Booking.findByIdAndDelete(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
      data: {
        bookingId: booking._id,
        deletedSeats: booking.selectedSeats,
      },
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getDayWiseBookings = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required (YYYY-MM-DD)",
      });
    }

    // Start & end of the selected day (UTC-safe)
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("trip", "title price")
      .sort({ createdAt: -1 });

    let totalSales = 0;
    let totalPaidAmount = 0;
    let totalRemainingAmount = 0;

    const formattedBookings = bookings.map((booking) => {
      totalSales += booking.price || 0;
      totalPaidAmount += booking.advancePaid || 0;
      totalRemainingAmount += booking.remainingBalance || 0;

      return {
        bookingId: booking._id,
        tripName: booking.trip?.title || "",
        tripPrice: booking.price,
        bookingDate: booking.createdAt,

        payment: {
          totalPrice: booking.price,
          paidAmount: booking.advancePaid,
          remainingAmount: booking.remainingBalance,
          paymentStatus: booking.paymentStatus,
        },

        passengers: booking.passengers.map((p) => ({
          name: p.name,
          email: p.email,
          phoneNumber: p.phoneNumber,
          idProof: p.idProof,
          idProofNumber: p.idProofNumber,
          age: p.age,
          gender: p.gender,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      date,
      totalBookings: bookings.length,
      totalSales,
      totalPaidAmount,
      totalRemainingAmount,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Day-wise booking error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

