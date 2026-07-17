import mongoose from "mongoose";

/**
 * Admin brochure library — title + image only.
 * Trips select a brochure; image path is copied onto the trip for public display/download.
 */
const brochureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    /** Relative path under /uploads (or full URL) */
    image: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

brochureSchema.index({ title: 1 });

const Brochure = mongoose.model("Brochure", brochureSchema);
export default Brochure;
