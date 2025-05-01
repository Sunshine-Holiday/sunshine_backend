// models/Trip.js
import mongoose from "mongoose";

const boardingPointSchema = new mongoose.Schema({
  location: { type: String, required: true },
  time: { type: String, required: true },
  details: { type: String, required: true },
  maplink: { type: String, required: false },
});

const startDateSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Store date as string (e.g., "2025-06-01")
  seats: {
    type: mongoose.Schema.Types.Mixed, // Allow number (32, 20) or string ("block")
    required: true,
    validate: {
      validator: function (value) {
        return (
          (typeof value === "number" && [20, 32].includes(value)) ||
          value === "block"
        );
      },
      message: 'Seats must be 20, 32, or "block"',
    },
  },
});

const tripSchema = new mongoose.Schema({
  banner: { type: String, required: true },
  title: { type: String, required: true },
  price: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  startDates: [startDateSchema], // Updated to use startDateSchema
  busSize: { type: String, required: true },
  category: { type: String, required: true },
  amenities: { type: [String] },
  boardingPoints: [boardingPointSchema],
});

export default mongoose.model("Trip", tripSchema);