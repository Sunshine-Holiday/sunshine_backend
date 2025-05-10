// controllers/reviewController.js
import mongoose from "mongoose";
import Review from "../model/Review.js";
import Booking from "../model/booking.js";
import { TryCatch } from "../middleware/error.js";

export const createReview = async (req, res) => {
  try {
    const { bookingId, description } = req.body;
    const userId = req.user._id;
    console.log(bookingId, description);
    const booking = await Booking.findById(bookingId)
      .populate("trip")
      .populate("user");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.user._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Parse the selected date (format: 'DD-MM-YYYY')
    const [day, month, year] = booking.selectedDate.split("-");
    const travelDate = new Date(`${year}-${month}-${day}`);
    const today = new Date();

    // Strip time
    const travelDay = new Date(travelDate.toDateString());
    const currentDay = new Date(today.toDateString());

    if (travelDay > currentDay) {
      return res
        .status(400)
        .json({ error: "You can only review after the trip" });
    }

    const alreadyReviewed = await Review.findOne({
      user: userId,
      booking: bookingId,
    });

    if (alreadyReviewed) {
      return res.status(400).json({ error: "Review already submitted" });
    }

    const newReview = await Review.create({
      trip: booking.trip._id,
      user: userId,
      booking: booking._id,
      travelDate,
      description,
      bookingDate: booking.selectedDate,
    });
    console.log(newReview);
    // Update the booking to set isReview to true
    await Booking.findByIdAndUpdate(bookingId, { isReview: true });

    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTripReviews = async (req, res) => {
  try {
    const { tripId } = req.params;

    const reviews = await Review.find({ trip: tripId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReviewByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;
    console.log(bookingId);
    const review = await Review.findOne({ booking: bookingId });

    if (!review) {
      return res
        .status(404)
        .json({ message: "No review found for this booking" });
    }

    res.status(200).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all reviews for a trip by selectedDate (for admin)

export const getReviewsByTripAndDate = async (req, res) => {
  try {
    const { tripId, selectedDate } = req.params;
    console.log(tripId, selectedDate);
    // Validate trip ID
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // Validate and convert date (expecting DD-MM-YYYY)
    const isValidDate = /^\d{2}-\d{2}-\d{4}$/.test(selectedDate);
    if (!isValidDate) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use DD-MM-YYYY" });
    }

    console.log("this is selected date", selectedDate);

    // Find reviews for the trip where bookingDate matches the formatted date
    const reviews = await Review.find({
      trip: tripId,
      bookingDate: selectedDate, // Use bookingDate from Review model
    })
      .populate("user")
      .populate("booking", "selectedDate selectedSeats passengers price status")
      .populate("trip", "title")
      .sort({ createdAt: -1 }); 

    if (!reviews.length) {
      return res
        .status(404)
        .json({ message: "No reviews found for this trip and date" });
    }

    res.status(200).json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update review (admin approval/disapproval)
export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isAdminApproved, isAdminDisApproved } = req.body;

    // Validate review ID
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    // Ensure only one status is updated at a time
    if (isAdminApproved !== undefined && isAdminDisApproved !== undefined) {
      return res
        .status(400)
        .json({
          message: "Cannot set both approval and disapproval at the same time",
        });
    }

    const updateFields = {};
    if (isAdminApproved !== undefined) {
      updateFields.isAdminApproved = isAdminApproved;
      updateFields.isAdminDisApproved = false; // Reset disapproval if approving
    }
    if (isAdminDisApproved !== undefined) {
      updateFields.isAdminDisApproved = isAdminDisApproved;
      updateFields.isAdminApproved = false; // Reset approval if disapproving
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $set: updateFields },
      { new: true }
    )
      .populate("user", "name")
      .populate("booking", "selectedDate")
      .populate("trip", "name");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Validate review ID
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Update associated booking
    await Booking.findByIdAndUpdate(review.booking, { isReview: false });

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single review by IDz
export const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Validate review ID
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review ID" });
    }

    const review = await Review.findById(reviewId)
      .populate("user", "name")
      .populate("booking", "selectedDate")
      .populate("trip", "name");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// const getTripReviews = TryCatch(async (req, res) => {
//   const { trip } = req.query;

//   if (!trip) {
//     res.status(400);
//     throw new Error('Trip ID is required');
//   }

//   const reviews = await Review.find({ trip })
//     .populate('user', 'email')
//     .select('user bookingDate travelDate description status');

//   res.status(200).json({
//     reviews,
//     message: reviews.length > 0 ? 'Reviews retrieved successfully' : 'No reviews found for this trip',
//   });
// });

// @desc    Update booking (e.g., toggle isReviewActivate)
// @route   PATCH /api/bookings/:bookingId
// @access  Private/Admin
export const updateBooking = TryCatch(async (req, res) => {
  const { bookingId } = req.params;
  const { isReviewActivate } = req.body;
  console.log("this is booking", bookingId);
  console.log("this is review", isReviewActivate);
  if (isReviewActivate === undefined) {
    res.status(400);
    throw new Error("isReviewActivate field is required");
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    res.status(404);
    throw new Error("Booking not found");
  }

  booking.isReviewActivate = isReviewActivate;
  await booking.save();

  res.status(200).json({
    booking,
    message: `Review activation ${
      isReviewActivate ? "enabled" : "disabled"
    } for booking`,
  });
});

// @desc    Update review status
// @route   PATCH /api/reviews/:reviewId
// @access  Private/Admin
export const updateReview = TryCatch(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findByIdAndUpdate(reviewId, req.body, {
    new: true,
  });

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  await review.save();

  res.status(200).json({
    review,
    message: `Review status updated to review`,
    review,
  });
});
