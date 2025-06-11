// models/Trip.js
import mongoose from "mongoose";

const boardingPointSchema = new mongoose.Schema({
  location: { type: String }, // Removed required: false (not needed, as fields are optional by default)
  time: { type: String },
  details: { type: String },
  maplink: { type: String },
});

const startDateSchema = new mongoose.Schema({
  date: { type: String }, // Removed required: true to allow optional date
  seats: {
    type: Number, // Keep as Number for consistency
    validate: {
      validator: function (value) {
        // Allow null/undefined or positive integers
        return value == null || (Number.isInteger(value) && value > 0);
      },
      message: "Seats must be a positive integer if provided",
    },
  },
});

const tripSchema = new mongoose.Schema({
  banner: { type: String }, // Removed required: true
  title: { type: String }, // Removed required: true
  price: { type: String }, // Removed required: true
  location: { type: String }, // Removed required: true
  description: { type: String }, // Removed required: true
  startDates: [startDateSchema], // Keep as array, no changes needed
  category: { type: String }, // Removed required: true
  amenities: { type: [String], default: [] }, // Added default to handle empty arrays
  boardingPoints: [boardingPointSchema], // Keep as array, no changes needed
});

export default mongoose.model("Trip", tripSchema);