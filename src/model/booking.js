import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema({
  phoneNumber:{ type: String, required: true },
  name: { type: String, required: true },
  age: { type: String, required: true },
  gender: { type: String, required: true },
  idProof: { type: String, required: true },
  idProofNumber: { type: String, required: true },
  address: { type: String },
});

const bookingSchema = new mongoose.Schema(
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
    selectedPackage: {
      type: mongoose.Schema.Types.ObjectId, // Reference to package _id
      // required: true,
    },
    selectedRoomChoice: {
      type: mongoose.Schema.Types.ObjectId, // Reference to room choice _id
      // required: true,
    },
    price: { type: Number, required: true }, // Total price based on package and room choice
    advancePaid: { type: Number, default: 0 }, // Amount paid upfront (50% of total)
    remainingBalance: { type: Number, default: 0 }, // Remaining amount to be paid offline
    paymentStatus: {
      type: String,
      enum: ["advance", "full", "pending"],
      default: "pending",
    },
    passengers: [passengerSchema],
    selectedDate: { type: String, required: true },
    selectedSeats: { type: [String], required: true },
    isReview: { type: Boolean, default: false },
    isReviewActivate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["confirmed", "processing", "refund", "resolved"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);