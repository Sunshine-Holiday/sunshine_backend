import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: String, required: true },
  gender: { type: String, required: true },
  idProof: { type: String, required: true },
  idProofNumber: { type: String, required: true },
  address: { type: String, required: true },
});

const bookingSchema = new mongoose.Schema({
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
  price: { type: String, required: true },
  passengers: [passengerSchema],
  selectedDate: { type: Date, required: true },
  selectedSeats: { type: [String], required: true },
});

export default mongoose.model("Booking", bookingSchema);
