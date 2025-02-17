// models/Trip.js
import mongoose from "mongoose";

const boardingPointSchema = new mongoose.Schema({
  location: { type: String, required: true },
  time: { type: String, required: true },
  details: { type: String, required: true },
  maplink: { type: String, required: true },
});

const tripSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  startDates: { type: [Date], required: true },
  busSize: { type: String, required: true },
  category: { type: String, required: true },
  amenities: { type: [String], required: true },
  boardingPoints: [boardingPointSchema],
});

export default mongoose.model("Trip", tripSchema);
