// models/Trip.js
import mongoose from "mongoose";

const boardingPointSchema = new mongoose.Schema({
  location: { type: String, required: true },
  time: { type: String, required: true },
  details: { type: String, required: false },
  maplink: { type: String, required: false },
});

const startDateSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Store date as string (e.g., "2025-06-01")
  seats: {
    type: Number, // Changed to Number instead of Mixed
    required: true,
    validate: {
      validator: function (value) {
        return Number.isInteger(value) && value > 0; // Ensure seats is a positive integer
      },
      message: "Seats must be a positive integer",
    },
  },
});

const tripSchema = new mongoose.Schema({
  banner: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  startDates: [startDateSchema],

  category: { type: String, required: true },
  amenities: { type: [String] },
  boardingPoints: [boardingPointSchema],
});

export default mongoose.model("Trip", tripSchema);