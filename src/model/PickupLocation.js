import mongoose from "mongoose";

/**
 * Centralized pickup / boarding locations.
 * Reused when creating or updating trips — trip only stores time + snapshot fields.
 */
const pickupLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Pickup location name is required"],
      trim: true,
      unique: true,
    },
    maplink: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

pickupLocationSchema.index({ name: 1 });

export default mongoose.model("PickupLocation", pickupLocationSchema);
