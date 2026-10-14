import mongoose from "mongoose";

const driverLocationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (value) =>
            Array.isArray(value) &&
            value.length === 2 &&
            value.every(Number.isFinite) &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90,
          message: "A valid longitude and latitude are required",
        },
      },
    },
    speedKph: { type: Number, default: 0, min: 0, max: 400 },
    heading: { type: Number, min: 0, max: 360 },
    accuracy: { type: Number, min: 0 },
    recordedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

driverLocationSchema.index({ location: "2dsphere" });
driverLocationSchema.index({ recordedAt: -1 });

const DriverLocation = mongoose.model("DriverLocation", driverLocationSchema);

export default DriverLocation;
