import mongoose from "mongoose";

// ✅ Vehicle / Instructor Schema
const vehicleSchema = new mongoose.Schema({
  instructorName: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  phoneNumber: { type: String, required: true },
});

// Boarding Point Schema
const boardingPointSchema = new mongoose.Schema({
  location: { type: String },
  time: { type: String },
  details: { type: String },
  maplink: { type: String },
});

// ✅ Updated Start Date Schema
const startDateSchema = new mongoose.Schema({
  date: { type: String },
  numberOfBusesAvailable: { type: String },
  minSeatsPerBooking: {
    type: Number,
    default: 1,
    min: 1,
  },
  seats: {
    type: Number,
    validate: {
      validator: function (value) {
        return value == null || (Number.isInteger(value) && value > 0);
      },
      message: "Seats must be a positive integer if provided",
    },
  },

  // 👉 NEW FIELD (Array of instructor + vehicle)
  vehicles: [vehicleSchema],
});

// Package Schema
const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  personCount: { type: Number, required: true },
  price: { type: Number, required: true },
});

// Room Choice Schema
const roomChoiceSchema = new mongoose.Schema({
  description: { type: String, required: true },
  roomCount: { type: Number, required: true },
  price: { type: Number, required: true },
});

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: true }
);

// Trip Schema
const tripSchema = new mongoose.Schema({
  banner: { type: String },
  /** Extra gallery images (paths). Combined with banner on details page. */
  banners: { type: [String], default: [] },
  title: { type: String },
  location: { type: String },
  /**
   * Destination / state tag used for navbar mega-menu filtering
   * and /destinations/:slug pages (e.g. Mahabaleshwar, Lonavala).
   */
  state: { type: String, default: "", index: true },
  description: { type: String },
  /** Point-wise trip highlights */
  highlights: { type: [String], default: [] },
  /** What the tour price includes */
  includes: { type: [String], default: [] },
  /** Google Maps link / embed URL for tour map */
  mapLink: { type: String, default: "" },
  /** Brochure image path (preview) */
  brochureImage: { type: String, default: "" },
  /** Brochure download file path (pdf/image) */
  brochureFile: { type: String, default: "" },
  /** Selected brochure from admin library */
  brochureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brochure",
    default: null,
  },
  faqs: { type: [faqSchema], default: [] },
  cancellationPolicy: { type: String, default: "" },
  startDates: [startDateSchema],
  price: { type: String },
  category: { type: String },
  amenities: { type: [String], default: [] },
  boardingPoints: [boardingPointSchema],
  packages: [packageSchema],
  roomChoices: [roomChoiceSchema],
  advancePaymentPercentage: { type: Number },
  discountPercentage: { type: Number },
  readonly: { type: Boolean, default: false },
  /**
   * Admin preference order (1 = first / highest priority).
   * Contiguous 1..N; auto-adjusted when one trip's index is updated.
   */
  displayIndex: {
    type: Number,
    default: 0,
    min: 0,
    index: true,
  },
  /**
   * Interconnected trips (e.g. Mahabaleshwar Sat / Sun / 2D1N share buses).
   * - outbound: going day-trip (e.g. Every Saturday)
   * - return: coming day-trip (e.g. Every Sunday)
   * - stay: multi-day package that uses outbound seats for going + return seats for coming
   */
  interconnection: {
    enabled: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["none", "outbound", "return", "stay"],
      default: "none",
    },
    /** Stay package: day-trip used for going seat map */
    outboundTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    /** Stay package: day-trip used for coming/return seat map */
    returnTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    /** Day trips: linked stay package that also occupies their seats */
    stayTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    /** Days between going date and return date (1 for 2D1N) */
    dayOffset: { type: Number, default: 1, min: 1 },
  },
});

export default mongoose.model("Trip", tripSchema);
