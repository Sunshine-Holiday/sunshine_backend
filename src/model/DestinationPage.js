import mongoose from "mongoose";

const destinationPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    /** Relative path under /uploads, or a full remote URL. */
    banner: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const DestinationPage = mongoose.model("DestinationPage", destinationPageSchema);

export default DestinationPage;
