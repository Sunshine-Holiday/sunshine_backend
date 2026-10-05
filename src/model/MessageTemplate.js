import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 1600
  },
  contentSid: {
    type: String,
    default: "",
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, {
  timestamps: true
});
export default mongoose.model("MessageTemplate", schema);
