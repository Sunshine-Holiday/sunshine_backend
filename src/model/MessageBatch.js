import mongoose from "mongoose";
const schema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  channel: {
    type: String,
    enum: ["sms", "whatsapp"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  contentSid: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  results: [{
    phone: String,
    status: String,
    providerId: String,
    error: String
  }]
}, {
  timestamps: true
});
export default mongoose.model("MessageBatch", schema);
