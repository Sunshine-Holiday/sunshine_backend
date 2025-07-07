import mongoose from "mongoose";

const boardingPointSchema = new mongoose.Schema({
  location: { type: String },
  time: { type: String },
  details: { type: String },
  maplink: { type: String },
});

const startDateSchema = new mongoose.Schema({
  date: { type: String },
  seats: {
    type: Number,
    validate: {
      validator: function (value) {
        return value == null || (Number.isInteger(value) && value > 0);
      },
      message: "Seats must be a positive integer if provided",
    },
  },
});

const packageSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Family Package"
  description: { type: String },
  personCount: { type: Number, required: true }, // Number of people (e.g., 4 for Family)
  price: { type: Number, required: true }, // Package-specific price
});

const roomChoiceSchema = new mongoose.Schema({
  description: { type: String, required: true }, // e.g., "1 room 4 people"
  personCount: { type: Number, required: true }, // Number of people this choice accommodates
  roomCount: { type: Number, required: true }, // Number of rooms
  price: { type: Number, required: true }, // Price for this room configuration
});

const tripSchema = new mongoose.Schema({
  banner: { type: String },
  title: { type: String },
  location: { type: String },
  description: { type: String },
  startDates: [startDateSchema],
   price: { type: String }, // single price for the trip
  category: { type: String },
  amenities: { type: [String], default: [] },
  boardingPoints: [boardingPointSchema],
  packages: [packageSchema], // Multiple package options (Family, Friends, Couple/Solo) offer optional
  roomChoices: [roomChoiceSchema], // Room booking options based on person count optional
});

export default mongoose.model("Trip", tripSchema);