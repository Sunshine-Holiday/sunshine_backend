import mongoose from "mongoose";

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: false },
  age: { type: String, required: false },
  gender: { type: String, required: false },
  idProof: { type: String, required: false },
  idProofNumber: { type: String, required: false },
  address: { type: String, required: false },
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
    price: { type: String, required: true },
    passengers: [passengerSchema],
    selectedDate: { type: String, required: true },
    selectedSeats: { type: [String], required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
