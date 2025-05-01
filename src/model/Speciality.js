// models/SpecialSection.js
import mongoose from "mongoose";

const specialSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    trips: [{ type: mongoose.Schema.Types.ObjectId, ref: "Trip" }],
  },
  { timestamps: true }
);

export default mongoose.model("SpecialSection", specialSectionSchema);
