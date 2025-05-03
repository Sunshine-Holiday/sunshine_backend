// models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    travelDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bookingDate:{
      type: String,
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    isAdminApproved: { type: Boolean, default: false },
    isAdminDisApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
