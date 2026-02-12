import mongoose from "mongoose";

// ✅ Vehicle / Instructor Schema
const vehicleSchema = new mongoose.Schema({
  instructorName: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

// Boarding Point Schema
const boardingPointSchema = new mongoose.Schema({
  location: { type: String },
  time: { type: String },
  details: { type: String },
  maplink: { type: String },
});

// ✅ Updated Start Date Schema
const startDateSchema = new mongoose.Schema({
  date: { type: String },
  numberOfBusesAvailable: { type: String },

  seats: {
    type: Number,
    validate: {
      validator: function (value) {
        return value == null || (Number.isInteger(value) && value > 0);
      },
      message: "Seats must be a positive integer if provided",
    },
  },

  // 👉 NEW FIELD (Array of instructor + vehicle)
  vehicles: [vehicleSchema],
});

// Package Schema
const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  personCount: { type: Number, required: true },
  price: { type: Number, required: true },
});

// Room Choice Schema
const roomChoiceSchema = new mongoose.Schema({
  description: { type: String, required: true },
  roomCount: { type: Number, required: true },
  price: { type: Number, required: true },
});

// Trip Schema
const tripSchema = new mongoose.Schema({
  banner: { type: String },
  title: { type: String },
  location: { type: String },
  description: { type: String },
  startDates: [startDateSchema],
  price: { type: String },
  category: { type: String },
  amenities: { type: [String], default: [] },
  boardingPoints: [boardingPointSchema],
  packages: [packageSchema],
  roomChoices: [roomChoiceSchema],
  advancePaymentPercentage: { type: Number },
  discountPercentage: { type: Number },
  readonly: { type: Boolean, default: false },
});

export default mongoose.model("Trip", tripSchema);
