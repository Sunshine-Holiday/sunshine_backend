import mongoose from "mongoose";
const schema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  // paise
  bookingData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "refund_required", "resolved"],
    default: "pending"
  },
  reason: {
    type: String,
    default: ""
  },
  refundReference: {
    type: String,
    default: ""
  },
  adminNote: {
    type: String,
    default: ""
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  resolvedAt: Date,
  revision: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
export default mongoose.model("PaymentAttempt", schema);
