import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    // validate: {
    //   // validator: function(v) {
    //   //   // return /^\+?\d{10,15}$/.test(v); // Validates phone number (10-15 digits, optional +)
    //   // },
    //   message: "Invalid phone number format",
    // },
  },
  name: { type: String, required: true, trim: true },
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
    // validate: {
    //   // validator: function(v) {
    //   //   // if (this.idProof === "aadhar") return /^\d{12}$/.test(v); // 12-digit Aadhar
    //   //   if (this.idProof === "pan") return /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(v); // 10-char PAN
    //   //   return false;
    //   // },
    //   message: "Invalid ID proof number format",
    // },
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.every((seat) => seat === "N/A" || /^\d+$/.test(seat));
        },
        message: "Seats must be 'N/A' or numeric",
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
