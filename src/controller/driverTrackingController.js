import DriverLocation from "../model/DriverLocation.js";
import User from "../model/userModel.js";
import ErrorHandler from "../utils/utilit-class.js";

const numberInRange = (value, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
};

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeLocation = (record) => ({
  id: record._id,
  userId: record.user?._id,
  name: record.user?.username || "Unnamed driver",
  email: record.user?.email || "",
  phone: record.user?.phone || "",
  profile: record.user?.profile || "",
  latitude: record.location.coordinates[1],
  longitude: record.location.coordinates[0],
  speedKph: record.speedKph || 0,
  heading: record.heading ?? null,
  accuracy: record.accuracy ?? null,
  recordedAt: record.recordedAt,
});

/** Authenticated drivers/users publish their latest browser or device GPS fix. */
export const updateMyDriverLocation = async (req, res, next) => {
  try {
    const latitude = numberInRange(req.body?.latitude, -90, 90);
    const longitude = numberInRange(req.body?.longitude, -180, 180);

    if (latitude === null || longitude === null) {
      return next(new ErrorHandler("Valid latitude and longitude are required", 400));
    }

    const rawSpeed = req.body?.speedKph ?? req.body?.speed ?? 0;
    let speedKph = numberInRange(rawSpeed, 0, 400);
    if (speedKph === null) speedKph = 0;
    if (req.body?.speedUnit === "mps") speedKph = Math.min(speedKph * 3.6, 400);

    const heading = numberInRange(req.body?.heading, 0, 360);
    const accuracy = numberInRange(req.body?.accuracy, 0, 100000);
    const recordedAt = req.body?.recordedAt
      ? new Date(req.body.recordedAt)
      : new Date();

    if (Number.isNaN(recordedAt.getTime())) {
      return next(new ErrorHandler("Invalid recordedAt timestamp", 400));
    }

    const record = await DriverLocation.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          location: { type: "Point", coordinates: [longitude, latitude] },
          speedKph,
          heading,
          accuracy,
          recordedAt,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("user", "username email phone profile");

    return res.status(200).json({
      success: true,
      location: serializeLocation(record),
    });
  } catch (error) {
    next(error);
  }
};

/** Admin dashboard feed. Search resolves against registered user details. */
export const getDriverLocations = async (req, res, next) => {
  try {
    const query = String(req.query?.search || "").trim().slice(0, 100);
    const locationFilter = {};

    if (query) {
      const matcher = new RegExp(escapeRegex(query), "i");
      const users = await User.find({
        $or: [{ username: matcher }, { email: matcher }, { phone: matcher }],
      })
        .select("_id")
        .limit(100)
        .lean();
      locationFilter.user = { $in: users.map((user) => user._id) };
    }

    const records = await DriverLocation.find(locationFilter)
      .populate("user", "username email phone profile")
      .sort({ recordedAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      success: true,
      drivers: records.filter((record) => record.user).map(serializeLocation),
      serverTime: new Date(),
    });
  } catch (error) {
    next(error);
  }
};
