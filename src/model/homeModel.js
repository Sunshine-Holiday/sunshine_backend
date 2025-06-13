
import mongoose from "mongoose";

const homeImageSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
    enum: ["image/png", "image/jpeg", "image/jpg"],
  },
  sequence: {
    type: Number,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const HomeImage = mongoose.model("HomeImage", homeImageSchema);

export default HomeImage;
