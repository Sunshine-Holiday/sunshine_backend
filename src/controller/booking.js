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



export const createBooking = async (req, res) => {
  try {
    const {
      tripId,
      selectedPackage,
      selectedRoomChoice,
      roomCount = 0,
      price,
      advancePaid = 0,
      selectedDate, // must be "DD-MM-YYYY"
      passengers,
      selectedSeats, // [{seat:"3", busIndex:0}, ...]
      isadminBooking = false,
      blockReason = "",
    } = req.body;

    // ---------------------------
    // 🔴 REQUIRED FIELD CHECK
    // ---------------------------
    if (
      !tripId ||
      price == null ||
      !selectedDate ||
      !Array.isArray(passengers) ||
      passengers.length === 0 ||
      !Array.isArray(selectedSeats) ||
      selectedSeats.length === 0
    ) {
      return res.status(400).json({
        message: "Missing required booking fields",
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
    // 📅 DATE FORMAT VALIDATION
    // ---------------------------
    if (!/^\d{2}-\d{2}-\d{4}$/.test(String(selectedDate))) {
      return res.status(400).json({
        message: "Selected date must be DD-MM-YYYY",
      });
    }

    // ---------------------------
    // ✅ FIND START DATE + VEHICLES FOR THIS DATE
    // ---------------------------
    const startDateObj =
      trip.startDates?.find((sd) => String(sd?.date).trim() === String(selectedDate).trim()) ||
      null;

    const vehicles = startDateObj?.vehicles || [];

    // (Optional) If you want to ensure buses exist when using multi-bus seats:
    // if (!startDateObj) {
    //   return res.status(400).json({ message: "Selected date not available for this trip" });
    // }

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
        p?.name &&
        p?.age &&
        ["male", "female", "other"].includes(p?.gender) &&
        ["aadhar", "pan"].includes(p?.idProof) &&
        p?.idProofNumber &&
        p?.phoneNumber &&
        p?.email
    );

    if (!validPassengers) {
      return res.status(400).json({
        message: "Invalid passenger details",
      });
    }

    // ---------------------------
    // 🪑 SEAT VALIDATION (MULTI BUS)
    // ---------------------------
    const seatsAreValid = selectedSeats.every(
      (s) =>
        typeof s === "object" &&
        typeof s.seat === "string" &&
        s.seat.trim() !== "" &&
        typeof s.busIndex === "number" &&
        Number.isFinite(s.busIndex) &&
        s.busIndex >= 0
    );

    if (!seatsAreValid) {
      return res.status(400).json({
        message: "Each seat must contain seat (string) and busIndex (number >= 0)",
      });
    }

    // ✅ if trip has vehicles list for this date, validate busIndex within range
    if (vehicles.length > 0) {
      const maxBusIndex = vehicles.length - 1;
      const busIndexOk = selectedSeats.every((s) => s.busIndex <= maxBusIndex);
      if (!busIndexOk) {
        return res.status(400).json({
          message: `Invalid busIndex. Max allowed busIndex is ${maxBusIndex}.`,
        });
      }
    }

    // ---------------------------
    // 🔒 PREVENT DOUBLE BOOKING
    // (same trip + interconnected linked trips: Sat/Sun/2D1N)
    // ---------------------------
    // Normalize legs on seats
    const normalizedSeats = selectedSeats.map((s) => ({
      seat: String(s.seat).trim(),
      busIndex: Number(s.busIndex),
      leg: ["going", "coming", "single"].includes(s.leg) ? s.leg : "single",
    }));

    // Stay interconnected bookings must provide both going + coming seats
    const ic = trip.interconnection || {};
    if (ic.enabled && ic.role === "stay") {
      const goingCount = normalizedSeats.filter((s) => s.leg === "going").length;
      const comingCount = normalizedSeats.filter(
        (s) => s.leg === "coming"
      ).length;
      if (goingCount === 0 || comingCount === 0) {
        return res.status(400).json({
          message:
            "Stay package requires seats for both Going and Coming legs",
        });
      }
      if (goingCount !== comingCount) {
        return res.status(400).json({
          message:
            "Number of Going seats must match number of Coming seats",
        });
      }
    }

    const {
      hasInterconnectedSeatConflict,
    } = await import("../utils/interconnection.js");

    const icConflict = await hasInterconnectedSeatConflict(
      trip,
      selectedDate,
      normalizedSeats
    );
    if (icConflict.conflict) {
      return res.status(400).json({
        message:
          icConflict.message ||
          "One or more selected seats are already booked on linked trips",
      });
    }

    // ---------------------------
    // 💰 PAYMENT VALIDATION
    // ---------------------------
    const totalPrice = Number(price);
    const adv = Number(advancePaid);

    if (!Number.isFinite(totalPrice) || !Number.isFinite(adv)) {
      return res.status(400).json({ message: "Invalid price values" });
    }

    if (totalPrice < 0 || adv < 0) {
      return res.status(400).json({
        message: "Price values cannot be negative",
      });
    }

    if (adv > totalPrice) {
      return res.status(400).json({
        message: "Advance paid cannot exceed total price",
      });
    }

    const remainingBalance = totalPrice - adv;

    let paymentStatus = "pending";
    if (adv > 0 && adv < totalPrice) paymentStatus = "advance";
    if (adv >= totalPrice) paymentStatus = "full";

    // ---------------------------
    // ✅ CREATE BOOKING
    // ---------------------------
    const adminBlock = Boolean(isadminBooking);
    const reason = String(blockReason || "").trim();

    // Admin seat blocks must include a reason for other admins
    if (adminBlock && !reason) {
      return res.status(400).json({
        message: "Please add a reason for blocking the seat(s)",
      });
    }

    const booking = new Booking({
      trip: tripId,
      selectedPackage: selectedPackage || null,
      selectedRoomChoice: selectedRoomChoice || null,
      roomCount,
      price: totalPrice,
      advancePaid: adv,
      remainingBalance,
      paymentStatus,
      passengers,
      selectedSeats: normalizedSeats,
      selectedDate,
      hasReview: false,
      reviewEnabled: false,
      status: "confirmed",
      isAdminBooking: adminBlock,
      blockReason: adminBlock ? reason : "",
    });

    await booking.save();

    // ---------------------------
    // ✉️ EMAILS (include vehicles so invoice shows bus+vehicle+instructor)
    // ---------------------------
    if (!adminBlock) {
      const emailPromises = booking.passengers.map((passenger) => {
        const htmlContent = generateBookingConfirmationHTML(
          booking,
          passenger,
          trip,
          vehicles // ✅ PASS VEHICLES
        );

        return sendMail({
          email: passenger.email,
          subject: "Booking Confirmation",
          html: htmlContent,
        });
      });

      // Admin copy
      emailPromises.push(
        sendMail({
          email: "sunshineholidaypackages@gmail.com",
          subject: "New Booking Confirmation",
          html: generateBookingConfirmationHTML(
            booking,
            booking.passengers[0],
            trip,
            vehicles // ✅ PASS VEHICLES
          ),
        })
      );

      await Promise.all(emailPromises);
    }

    return res.status(201).json({
      message: "Booking created successfully",
      booking,
      meta: {
        selectedDateFound: Boolean(startDateObj),
        vehiclesCount: vehicles.length,
      },
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
      return res.status(400).json({
        success: false,
        message: "Valid date in DD-MM-YYYY format is required",
      });
    }

    const tripBookings = await Booking.find({
      trip: id,
      selectedDate: date,
    }).populate("trip");


    if (!tripBookings || tripBookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No bookings found for this date" });
    }

    const trip = tripBookings[0].trip;
    console.log(trip);

    const matchingStartDate = (trip.startDates || []).find(
      (sd) => sd.date === date
    );
    const totalSeatsAvailable = matchingStartDate?.seats || 0;

    // ✅ correct seats count (seat is inside object)
    const bookedSeatsCount = tripBookings.reduce((total, booking) => {
      const seats = Array.isArray(booking.selectedSeats)
        ? booking.selectedSeats
        : [];

      const numericSeats = seats.filter((s) => {
        const seatStr = String(s?.seat ?? "").trim();
        return seatStr !== "N/A" && seatStr !== "block" && /^\d+$/.test(seatStr);
      }).length;

      return total + numericSeats;
    }, 0);

    // ✅ passenger-wise history (flatten)
    // passengers[i] is paired with selectedSeats[i] (same order at booking time)
    const passengerHistory = [];
    for (const booking of tripBookings) {
      const passengers = Array.isArray(booking.passengers)
        ? booking.passengers
        : [];
      const seats = Array.isArray(booking.selectedSeats)
        ? booking.selectedSeats
        : [];

      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        // Individual seat booked by this passenger (index-aligned)
        const assignedSeat = seats[i] || null;

        passengerHistory.push({
          bookingId: booking._id,

          // Trip info
          trip: {
            tripId: trip._id,
            tripName: trip.title || trip.location,
            destination: trip.category || trip.location,
            date: booking.selectedDate,
          },

          // Passenger info (full schema)
          passenger: {
            name: p.name,
            phoneNumber: p.phoneNumber,
            email: p.email,
            age: p.age,
            gender: p.gender,
            idProof: p.idProof,
            idProofNumber: p.idProofNumber,
            address: p.address || "",
            dropLocation: p.dropLocation || "",
          },

          // Individual seat for THIS passenger
          seat: assignedSeat
            ? {
                seat: String(assignedSeat.seat ?? ""),
                busIndex: Number(assignedSeat.busIndex ?? 0),
              }
            : null,
          seatNumber: assignedSeat ? String(assignedSeat.seat ?? "") : "",
          busIndex: assignedSeat != null ? Number(assignedSeat.busIndex ?? 0) : null,

          // Full seats list (compat for UI) + booking info
          selectedSeats: seats,
          selectedPackage: booking.selectedPackage,
          selectedRoomChoice: booking.selectedRoomChoice,
          roomCount: booking.roomCount,

          // Payment info
          price: booking.price,
          advancePaid: booking.advancePaid,
          remainingBalance: booking.remainingBalance,
          paymentStatus: booking.paymentStatus,

          // Status + review flags
          status: booking.status,
          hasReview: booking.hasReview,
          reviewEnabled: booking.reviewEnabled,

          // Admin block note (why seats were blocked)
          isAdminBooking: Boolean(booking.isAdminBooking),
          blockReason: booking.blockReason || "",

          createdAt: booking.createdAt,
        });
      }
    }

    return res.status(200).json({
      success: true,
      tripDetails: {
        tripId: trip._id,
        tripName: trip.name || trip.location,
        destination: trip.category || trip.location,
        date,
        totalSeatsAvailable,
        bookedSeatsCount,
        availableSeats: totalSeatsAvailable - bookedSeatsCount,
      },
      selectedDate: date,
      totalBookings: tripBookings.length,
      totalPassengers: passengerHistory.length,
      passengerHistory,
      message: `${passengerHistory.length} passenger record(s) found for ${date}`,
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
    // leg: single | going | coming — used for interconnected stay dual maps
    const { selectedDate: querySelectedDate, leg: queryLeg } = req.query;

    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Trip ID is required",
      });
    }

    if (querySelectedDate && !/^\d{2}-\d{2}-\d{4}$/.test(querySelectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use DD-MM-YYYY",
      });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const filter = { trip: tripId };
    if (querySelectedDate) filter.selectedDate = querySelectedDate;

    const bookings = await Booking.find(filter);

    /* ---------------------------------- */
    /* 🚌 INTERCONNECTED OCCUPIED SEATS   */
    /* ---------------------------------- */
    const mapLeg = ["going", "coming", "single"].includes(queryLeg)
      ? queryLeg
      : "single";

    let selectedSeatsByBus = {};
    if (querySelectedDate) {
      const {
        getInterconnectedOccupiedSeats,
      } = await import("../utils/interconnection.js");
      selectedSeatsByBus = await getInterconnectedOccupiedSeats(
        trip,
        querySelectedDate,
        mapLeg
      );
    } else {
      // No date: only this trip's seats (legacy)
      bookings.forEach((booking) => {
        (booking.selectedSeats || []).forEach((seatObj) => {
          if (!seatObj || seatObj.seat === "N/A") return;
          const { seat, busIndex } = seatObj;
          if (typeof seat === "string" && typeof busIndex === "number") {
            if (!selectedSeatsByBus[busIndex]) selectedSeatsByBus[busIndex] = [];
            if (!selectedSeatsByBus[busIndex].includes(seat)) {
              selectedSeatsByBus[busIndex].push(seat);
            }
          }
        });
      });
    }

    let totalSeatsBooked = 0;
    Object.values(selectedSeatsByBus).forEach((arr) => {
      totalSeatsBooked += Array.isArray(arr) ? arr.length : 0;
    });

    const totalPassengers = bookings.reduce(
      (sum, b) => sum + (b.passengers?.length || 0),
      0,
    );

    const uniqueCustomers = new Set(
      bookings.map((b) => b.passengers?.[0]?.phoneNumber).filter(Boolean),
    ).size;

    let seatsPerBus = 0;
    let numberOfBusesAvailable = 1;

    // For stay going/coming maps, capacity comes from linked day-trip
    let capacityTrip = trip;
    const ic = trip.interconnection || {};
    if (ic.enabled && ic.role === "stay") {
      if (mapLeg === "going" && ic.outboundTrip) {
        capacityTrip = (await Trip.findById(ic.outboundTrip)) || trip;
      } else if (mapLeg === "coming" && ic.returnTrip) {
        capacityTrip = (await Trip.findById(ic.returnTrip)) || trip;
      }
    }

    let capacityDate = querySelectedDate;
    if (
      ic.enabled &&
      ic.role === "stay" &&
      mapLeg === "coming" &&
      querySelectedDate
    ) {
      const { addDaysToDateStr } = await import("../utils/interconnection.js");
      capacityDate = addDaysToDateStr(
        querySelectedDate,
        Math.max(1, Number(ic.dayOffset) || 1)
      );
    }

    if (capacityTrip?.startDates && capacityDate) {
      const matchingDate = capacityTrip.startDates.find(
        (sd) => sd.date === capacityDate
      );
      // For stay going map, use stay start date on outbound trip
      const matchingGoing =
        !matchingDate && mapLeg === "going" && querySelectedDate
          ? capacityTrip.startDates.find((sd) => sd.date === querySelectedDate)
          : matchingDate;

      const md = matchingGoing || matchingDate;
      if (md) {
        seatsPerBus = Number(md.seats || 0);
        numberOfBusesAvailable = Number(md.numberOfBusesAvailable || 1);
      }
    }

    // Fallback: this trip's date
    if (!seatsPerBus && trip?.startDates && querySelectedDate) {
      const md = trip.startDates.find((sd) => sd.date === querySelectedDate);
      if (md) {
        seatsPerBus = Number(md.seats || 0);
        numberOfBusesAvailable = Number(md.numberOfBusesAvailable || 1);
      }
    }

    // Driver seat is blocked on layouts: 20→19 bookable, 32→31 bookable
    const bookableSeatsPerBus =
      seatsPerBus === 20 ? 19 : seatsPerBus === 32 ? 31 : seatsPerBus;
    const totalAvailableSeats =
      bookableSeatsPerBus * numberOfBusesAvailable;
    const availableSeats = Math.max(0, totalAvailableSeats - totalSeatsBooked);

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings: bookings.length,
        totalPassengers,
        totalSeatsBooked,
        availableSeats,
        totalAvailableSeats,
        uniqueCustomers,
        // Keep raw configured size for layout selection; capacity uses bookable
        seatsPerBus,
        bookableSeatsPerBus,
        numberOfBusesAvailable,
      },
      selectedSeatsByBus,
      selectedDate: querySelectedDate,
      leg: mapLeg,
      interconnection: ic.enabled
        ? { enabled: true, role: ic.role, dayOffset: ic.dayOffset }
        : { enabled: false },
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
          address: p.address || "",
          dropLocation: p.dropLocation || "",
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
