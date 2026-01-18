import mongoose from "mongoose";
const seatSchema = new mongoose.Schema(
  {
    seat: {
      type: String,
      required: true,
      trim: true,
    },
    busIndex: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const passengerSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  age: {
    type: Number,
    required: true,
    min: [0, "Age cannot be negative"],
    max: [150, "Age is too high"],
  },
  gender: { type: String, required: true, enum: ["male", "female", "other"] },
  idProof: { type: String, required: true, enum: ["aadhar", "pan"] },
  idProofNumber: {
    type: String,
    required: true,
    trim: true,
  },
  address: { type: String, trim: true },
});

const bookingSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    // user field has been removed

    selectedPackage: {
      type: mongoose.Schema.Types.ObjectId, // Sub-document ID from Trip.packages
      default: null,
    },
    selectedRoomChoice: {
      type: mongoose.Schema.Types.ObjectId, // Sub-document ID from Trip.roomChoices
      default: null,
    },
    roomCount: {
      type: Number,
      required: function () {
        return !!this.selectedRoomChoice;
      },
      min: [0, "Room count cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: [0, "Advance paid cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.price;
        },
        message: "Advance paid cannot exceed total price",
      },
    },
    remainingBalance: {
      type: Number,
      default: 0,
      min: [0, "Remaining balance cannot be negative"],
      validate: {
        validator: function (v) {
          return this.advancePaid + v <= this.price;
        },
        message:
          "Advance paid plus remaining balance cannot exceed total price",
      },
    },
    paymentStatus: {
      type: String,
      enum: ["advance", "full", "pending"],
      default: "pending",
    },
    passengers: [passengerSchema],
    selectedDate: { type: String, required: true },
    selectedSeats: {
      type: [seatSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v.every(
            (s) =>
              typeof s.seat === "string" &&
              typeof s.busIndex === "number" &&
              s.busIndex >= 0
          );
        },
        message: "Each seat must contain seat number and busIndex",
      },
    },

    hasReview: {
      type: Boolean,
      default: false,
    },
    reviewEnabled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["confirmed", "processing", "refund", "resolved"],
      default: "confirmed",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Booking", bookingSchema);
