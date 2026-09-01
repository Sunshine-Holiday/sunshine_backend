import Review from "../model/Review.js";
import Trip from "../model/Trip.js";

/**
 * Ensure every trip has a contiguous displayIndex 1..N
 * (handles legacy trips without the field / gaps after delete).
 * Sorted by existing displayIndex, then createdAt for stability.
 */
const ensureContiguousDisplayIndexes = async () => {
  const trips = await Trip.find().sort({
    displayIndex: 1,
    _id: 1,
  });

  let needsFix = false;
  for (let i = 0; i < trips.length; i++) {
    const expected = i + 1;
    if (Number(trips[i].displayIndex) !== expected) {
      needsFix = true;
      break;
    }
  }

  // Also fix if any missing/zero/duplicate when length > 0
  if (!needsFix && trips.length > 0) {
    const seen = new Set();
    for (const t of trips) {
      const v = Number(t.displayIndex);
      if (!v || v < 1 || seen.has(v)) {
        needsFix = true;
        break;
      }
      seen.add(v);
    }
  }

  if (needsFix) {
    // Sort: valid positive indexes first (asc), then by _id for stability
    trips.sort((a, b) => {
      const ai = Number(a.displayIndex) || 0;
      const bi = Number(b.displayIndex) || 0;
      if (ai > 0 && bi > 0 && ai !== bi) return ai - bi;
      if (ai > 0 && bi <= 0) return -1;
      if (bi > 0 && ai <= 0) return 1;
      return String(a._id).localeCompare(String(b._id));
    });

    for (let i = 0; i < trips.length; i++) {
      const next = i + 1;
      if (Number(trips[i].displayIndex) !== next) {
        // Use updateOne to avoid full-document validation on legacy trips
        await Trip.updateOne(
          { _id: trips[i]._id },
          { $set: { displayIndex: next } }
        );
      }
    }
  }

  return Trip.find().sort({ displayIndex: 1, _id: 1 });
};

export const createTrip = async (req, res) => {
  try {
    // Multi-banner support: all uploaded images (file + banners fields)
    const uploaded = Array.isArray(req.uploadedFiles)
      ? req.uploadedFiles
      : req.file
        ? [req.file]
        : [];
    const uploadedPaths = uploaded
      .map((f) => f?.path)
      .filter((p) => typeof p === "string" && p.trim());

    if (uploadedPaths.length === 0) {
      return res.status(400).json({ message: "At least one banner image is required" });
    }
    const file = { path: uploadedPaths[0] };

    const {
      readonly,
      title,
      price,
      location,
      state,
      description,
      startDates,
      category,
      amenities,
      boardingPoints,
      dropPoints,
      packages,
      roomChoices,
         advancePaymentPercentage,
    discountPercentage
    } = req.body;

    // Parse arrays from form data
    const parsedAmenities = Array.isArray(amenities)
      ? amenities
      : amenities
      ? JSON.parse(amenities)
      : [];

    const parsedBoardingPoints = Array.isArray(boardingPoints)
      ? boardingPoints
      : boardingPoints
      ? JSON.parse(boardingPoints)
      : [];

    const parsedDropPoints = Array.isArray(dropPoints)
      ? dropPoints
      : dropPoints
      ? (() => {
          try {
            const parsed = JSON.parse(dropPoints);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            return [];
          }
        })()
      : [];

    const parsedStartDates = Array.isArray(startDates)
      ? startDates
      : startDates
      ? (() => {
          try {
            const parsed = JSON.parse(startDates);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            return [];
          }
        })()
      : [];

    const parsedPackages = Array.isArray(packages)
      ? packages
      : packages
      ? (() => {
          try {
            const parsed = JSON.parse(packages);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            return [];
          }
        })()
      : [];

    const parsedRoomChoices = Array.isArray(roomChoices)
      ? roomChoices
      : roomChoices
      ? (() => {
          try {
            const parsed = JSON.parse(roomChoices);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            return [];
          }
        })()
      : [];

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!location) {
      return res.status(400).json({ message: "Location is required" });
    }
    if (!state || !String(state).trim()) {
      return res.status(400).json({ message: "State / destination is required" });
    }
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }
    if (!readonly &&parsedStartDates.length === 0) {
      return res.status(400).json({ message: "At least one start date is required" });
    }
    if (parsedBoardingPoints.length === 0) {
      return res.status(400).json({ message: "At least one boarding point is required" });
    }

    // Validate price and packages
    const parsedPrice = price ? parseFloat(price) : 0;
    if (!readonly && parsedPackages.length === 0 && (!parsedPrice || parsedPrice <= 0)) {
      return res.status(400).json({ message: "Price is required when no packages are provided" });
    }

    // Validate startDates format
    for (const startDate of parsedStartDates) {
      if (startDate.seats !== undefined && startDate.seats !== "block" && (!Number.isInteger(startDate.seats) || startDate.seats <= 0)) {
        return res.status(400).json({ message: "Seats must be a positive integer if provided" });
      }
    }

    // Validate packages
    for (const pkg of parsedPackages) {
      if (!pkg.title) {
        return res.status(400).json({ message: "Package title is required" });
      }
      if (!pkg.personCount || !Number.isInteger(pkg.personCount) || pkg.personCount <= 0) {
        return res.status(400).json({ message: "Package person count must be a positive integer" });
      }
      if (!pkg.price || isNaN(pkg.price) || pkg.price <= 0) {
        return res.status(400).json({ message: "Package price must be a positive number" });
      }
    }

    // Validate roomChoices (optional, but validate if provided)
    for (const room of parsedRoomChoices) {
      if (room.description) {
        // if (!room.personCount || !Number.isInteger(room.personCount) || room.personCount <= 0) {
        //   return res.status(400).json({ message: "Room choice person count must be a positive integer" });
        // }
        if (!room.roomCount || !Number.isInteger(room.roomCount) || room.roomCount <= 0) {
          return res.status(400).json({ message: "Room choice room count must be a positive integer" });
        }
        if (!room.price || isNaN(room.price) || room.price <= 0) {
          return res.status(400).json({ message: "Room choice price must be a positive number" });
        }
      }
    }

    // Construct trip object with provided fields
    const tripData = { banner: file.path };
    if (readonly) {
      tripData.readonly = readonly;
    }
    if (title) tripData.title = title;
    if (parsedPrice > 0) tripData.price = parsedPrice;
    if (location) tripData.location = location;
    if (state) tripData.state = String(state).trim();
    if (description) tripData.description = description;
    if (parsedStartDates.length > 0) tripData.startDates = parsedStartDates;
    if (category) tripData.category = category;

    // Interconnected trips (Sat / Sun / 2D1N seat sharing)
    const { parseInterconnectionBody } = await import(
      "../utils/interconnection.js"
    );
    tripData.interconnection = parseInterconnectionBody(req.body);
    if (parsedAmenities.length > 0) tripData.amenities = parsedAmenities;
    if (parsedBoardingPoints.length > 0) tripData.boardingPoints = parsedBoardingPoints;
    if (parsedDropPoints.length > 0) tripData.dropPoints = parsedDropPoints;
    if (parsedPackages.length > 0) tripData.packages = parsedPackages;
    if (parsedRoomChoices.length > 0) tripData.roomChoices = parsedRoomChoices;
 
    if (typeof advancePaymentPercentage !== "undefined") {
      tripData.advancePaymentPercentage = advancePaymentPercentage;
    }
    if (typeof discountPercentage !== "undefined") {
      tripData.discountPercentage = discountPercentage;
    }

    // Details page content (optional)
    const parseJsonArray = (field) => {
      if (Array.isArray(field)) return field;
      if (!field) return [];
      try {
        const p = JSON.parse(field);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    };
    const {
      highlights,
      includes,
      mapLink,
      faqs,
      cancellationPolicy,
      brochureImage,
      brochureFile,
      brochureId,
      banners,
    } = req.body;

    const parsedHighlights = parseJsonArray(highlights).filter(
      (h) => typeof h === "string" && h.trim()
    );
    const parsedIncludes = parseJsonArray(includes).filter(
      (h) => typeof h === "string" && h.trim()
    );
    const parsedFaqs = parseJsonArray(faqs).filter(
      (f) => f && f.question && f.answer
    );
    const parsedBanners = parseJsonArray(banners).filter(
      (b) => typeof b === "string" && b.trim()
    );

    if (parsedHighlights.length) tripData.highlights = parsedHighlights;
    if (parsedIncludes.length) tripData.includes = parsedIncludes;
    if (parsedFaqs.length) tripData.faqs = parsedFaqs;
    if (mapLink) tripData.mapLink = String(mapLink).trim();
    if (cancellationPolicy)
      tripData.cancellationPolicy = String(cancellationPolicy);
    if (brochureImage) tripData.brochureImage = String(brochureImage);
    if (brochureFile) tripData.brochureFile = String(brochureFile);
    if (brochureId !== undefined) {
      tripData.brochureId =
        brochureId && String(brochureId).trim() ? brochureId : null;
    }
    // Merge path strings from body (rare) with newly uploaded files; primary = first
    const allBanners = [
      ...uploadedPaths,
      ...parsedBanners.filter((b) => !uploadedPaths.includes(b)),
    ];
    // Dedupe preserve order
    tripData.banners = [...new Set(allBanners.filter(Boolean))];
    tripData.banner = tripData.banners[0];

    // New trips go to the end of preference order
    const lastTrip = await Trip.findOne().sort({ displayIndex: -1 }).select("displayIndex");
    const maxIndex = lastTrip?.displayIndex ? Number(lastTrip.displayIndex) : 0;
    tripData.displayIndex = maxIndex > 0 ? maxIndex + 1 : 1;

    const trip = new Trip(tripData);
    const savedTrip = await trip.save();

    // Keep day-trips pointing back at this stay package for shared seat maps
    if (
      savedTrip.interconnection?.enabled &&
      savedTrip.interconnection.role === "stay"
    ) {
      const stayId = savedTrip._id;
      const { outboundTrip, returnTrip, dayOffset } =
        savedTrip.interconnection;
      if (outboundTrip) {
        await Trip.findByIdAndUpdate(outboundTrip, {
          $set: {
            "interconnection.enabled": true,
            "interconnection.role": "outbound",
            "interconnection.stayTrip": stayId,
            "interconnection.dayOffset": dayOffset || 1,
          },
        });
      }
      if (returnTrip) {
        await Trip.findByIdAndUpdate(returnTrip, {
          $set: {
            "interconnection.enabled": true,
            "interconnection.role": "return",
            "interconnection.stayTrip": stayId,
            "interconnection.dayOffset": dayOffset || 1,
          },
        });
      }
    }

    res.status(201).json(savedTrip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllTrips = async (req, res) => {
  try {
    // Preference order first (1 = highest); auto-normalize missing indexes
    const trips = await ensureContiguousDisplayIndexes();
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update one trip's preference index; all other trips shift automatically.
 * Body: { displayIndex: number }  // 1-based position
 *
 * Example: 5 trips [A,B,C,D,E] at 1..5
 * Move E to index 2 → [A,E,B,C,D] with indexes 1..5
 */
export const updateTripDisplayIndex = async (req, res) => {
  try {
    const { id } = req.params;
    let { displayIndex } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Trip ID is required" });
    }

    displayIndex = Number(displayIndex);
    if (!Number.isInteger(displayIndex) || displayIndex < 1) {
      return res.status(400).json({
        success: false,
        message: "displayIndex must be a positive integer starting from 1",
      });
    }

    const trips = await ensureContiguousDisplayIndexes();
    const total = trips.length;

    if (total === 0) {
      return res.status(404).json({ success: false, message: "No trips found" });
    }

    const trip = trips.find((t) => String(t._id) === String(id));
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    // Clamp to valid range 1..total
    const newIndex = Math.min(displayIndex, total);
    const oldIndex = Number(trip.displayIndex);

    if (oldIndex === newIndex) {
      return res.status(200).json({
        success: true,
        message: "Preference unchanged",
        trip,
        trips,
      });
    }

    // Remove trip from ordered list and insert at new position
    const ordered = trips.filter((t) => String(t._id) !== String(id));
    ordered.splice(newIndex - 1, 0, trip);

    // Reassign contiguous indexes 1..N
    // Two-pass to avoid unique conflicts if any partial unique index exists later
    for (let i = 0; i < ordered.length; i++) {
      await Trip.findByIdAndUpdate(ordered[i]._id, {
        displayIndex: -(i + 1),
      });
    }
    for (let i = 0; i < ordered.length; i++) {
      await Trip.findByIdAndUpdate(ordered[i]._id, {
        displayIndex: i + 1,
      });
    }

    const updatedTrips = await Trip.find().sort({ displayIndex: 1, _id: 1 });
    const updatedTrip = updatedTrips.find((t) => String(t._id) === String(id));

    return res.status(200).json({
      success: true,
      message: `Trip preference updated to #${newIndex}. Other trips reordered automatically.`,
      trip: updatedTrip,
      trips: updatedTrips,
    });
  } catch (error) {
    console.error("Error updating trip display index:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update trip preference",
      error: error.message,
    });
  }
};



export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Fetch top 10 reviews sorted by bookingDate descending
    const reviews = await Review.find({ trip: req.params.id })
      .sort({ bookingDate: -1 }) // descending order
      .limit(10)
      .populate("user") // optionally populate user details
      .populate("booking", "bookingNumber"); // optionally populate booking info

    const { populateInterconnection } = await import(
      "../utils/interconnection.js"
    );
    const tripOut = await populateInterconnection(trip);

    res.status(200).json({ trip: tripOut, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const updateTrip = async (req, res) => {
  try {
    const id = req.params.id;

    const {
      title,
      price,
      location,
      state,
      description,
      startDates,
      category,
      amenities,
      boardingPoints,
      dropPoints,
      packages,
      roomChoices,
      advancePaymentPercentage,
      discountPercentage,
      readonly,
      highlights,
      includes,
      mapLink,
      faqs,
      cancellationPolicy,
      brochureImage,
      brochureFile,
      brochureId,
      banners,
    } = req.body;

    const file = req.file;
    const uploaded = Array.isArray(req.uploadedFiles)
      ? req.uploadedFiles
      : req.file
        ? [req.file]
        : [];
    const uploadedPaths = uploaded
      .map((f) => f?.path)
      .filter((p) => typeof p === "string" && p.trim());

    // ---------------------------
    // 🔧 Helpers
    // ---------------------------
    const parseArray = (field) => {
      if (Array.isArray(field)) return field;
      if (!field) return [];
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    // ---------------------------
    // 🧠 Parse incoming data
    // ---------------------------
    const parsedAmenities = parseArray(amenities);
    const parsedBoardingPoints = parseArray(boardingPoints);
    const parsedDropPoints = parseArray(dropPoints);
    const parsedStartDates = parseArray(startDates);
    const parsedPackages = parseArray(packages);
    const parsedRoomChoices = parseArray(roomChoices);

    const parsedPrice =
      price !== undefined && price !== "" ? Number(price) : 0;

    // ---------------------------
    // ❗ BASIC VALIDATIONS
    // ---------------------------
    if (!title)
      return res.status(400).json({ message: "Title is required" });

    if (!location)
      return res.status(400).json({ message: "Location is required" });

    if (!state || !String(state).trim())
      return res
        .status(400)
        .json({ message: "State / destination is required" });

    if (!description)
      return res.status(400).json({ message: "Description is required" });

    if (!category)
      return res.status(400).json({ message: "Category is required" });

    if (!readonly && parsedStartDates.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one start date is required" });
    }

    if (parsedBoardingPoints.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one boarding point is required" });
    }

    // ---------------------------
    // 🚌 START DATES VALIDATION
    // ---------------------------
    for (const date of parsedStartDates) {
      // Convert buses to NUMBER (IMPORTANT FIX)
      const buses = Number(date.numberOfBusesAvailable);

      if (!Number.isInteger(buses) || buses <= 0) {
        return res
          .status(400)
          .json({ message: "Invalid number of buses" });
      }

      // normalize back to STRING (schema expects string)
      date.numberOfBusesAvailable = String(buses);

      // Seats validation
      if (
        date.seats !== "block" &&
        (!Number.isInteger(date.seats) || date.seats <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid seat count" });
      }
    }

    // ---------------------------
    // 💰 PRICE / PACKAGE RULE
    // ---------------------------
    if (
      !readonly &&
      parsedPackages.length === 0 &&
      (!parsedPrice || parsedPrice <= 0)
    ) {
      return res.status(400).json({
        message: "Price is required when no packages are provided",
      });
    }

    // ---------------------------
    // 📦 PACKAGE VALIDATION
    // ---------------------------
    for (const pkg of parsedPackages) {
      if (!pkg.title) {
        return res
          .status(400)
          .json({ message: "Package title is required" });
      }

      if (!Number.isInteger(pkg.personCount) || pkg.personCount <= 0) {
        return res.status(400).json({
          message: "Package person count must be a positive integer",
        });
      }

      if (!pkg.price || pkg.price <= 0) {
        return res
          .status(400)
          .json({ message: "Package price must be positive" });
      }
    }

    // ---------------------------
    // 🏨 ROOM VALIDATION
    // ---------------------------
    for (const room of parsedRoomChoices) {
      if (room.description) {
        if (!Number.isInteger(room.roomCount) || room.roomCount <= 0) {
          return res.status(400).json({
            message: "Room count must be a positive integer",
          });
        }

        if (!room.price || room.price <= 0) {
          return res
            .status(400)
            .json({ message: "Room price must be positive" });
        }
      }
    }

    // ---------------------------
    // 📊 PERCENTAGE VALIDATION
    // ---------------------------
    if (
      advancePaymentPercentage !== undefined &&
      (advancePaymentPercentage < 0 || advancePaymentPercentage > 100)
    ) {
      return res.status(400).json({
        message: "Advance payment must be between 0 and 100",
      });
    }

    if (
      discountPercentage !== undefined &&
      (discountPercentage < 0 || discountPercentage > 100)
    ) {
      return res
        .status(400)
        .json({ message: "Discount must be between 0 and 100" });
    }

    // ---------------------------
    // 🧾 UPDATE OBJECT
    // ---------------------------
    const updateData = {
      title,
      location,
      state: String(state).trim(),
      description,
      category,
      price: parsedPrice,
      startDates: parsedStartDates,
      amenities: parsedAmenities,
      boardingPoints: parsedBoardingPoints,
      dropPoints: parsedDropPoints,
      packages: parsedPackages,     // ✅ empty array allowed
      roomChoices: parsedRoomChoices, // ✅ empty array allowed
    };

    if (advancePaymentPercentage !== undefined) {
      updateData.advancePaymentPercentage = advancePaymentPercentage;
    }

    if (discountPercentage !== undefined) {
      updateData.discountPercentage = discountPercentage;
    }

    // Optional details-page fields
    if (highlights !== undefined) {
      updateData.highlights = parseArray(highlights).filter(
        (h) => typeof h === "string" && h.trim()
      );
    }
    if (includes !== undefined) {
      updateData.includes = parseArray(includes).filter(
        (h) => typeof h === "string" && h.trim()
      );
    }
    if (faqs !== undefined) {
      updateData.faqs = parseArray(faqs).filter(
        (f) => f && f.question && f.answer
      );
    }
    // Multi-banner update:
    // - body.existingBanners / body.banners (JSON) = kept existing paths
    // - uploaded files = new images to append
    const existingFromBody =
      req.body.existingBanners !== undefined
        ? req.body.existingBanners
        : banners;
    if (existingFromBody !== undefined || uploadedPaths.length > 0) {
      // body.banners may be JSON string or polluted by multipart; prefer existingBanners
      let kept = [];
      if (existingFromBody !== undefined) {
        kept = parseArray(existingFromBody).filter(
          (b) => typeof b === "string" && b.trim() && !b.startsWith("{")
        );
        // parseArray already handles JSON string; also filter accidental non-paths
        kept = kept.filter(
          (b) =>
            b.includes("uploads") ||
            b.startsWith("http") ||
            b.includes("/")
        );
      }
      const merged = [
        ...kept,
        ...uploadedPaths.filter((p) => !kept.includes(p)),
      ];
      const unique = [...new Set(merged.filter(Boolean))];
      if (unique.length > 0) {
        updateData.banners = unique;
        updateData.banner = unique[0];
      } else if (file?.path) {
        updateData.banners = [file.path];
        updateData.banner = file.path;
      }
    } else if (file?.path) {
      updateData.banner = file.path;
      updateData.banners = [file.path];
    }
    if (mapLink !== undefined) updateData.mapLink = String(mapLink || "");
    if (cancellationPolicy !== undefined)
      updateData.cancellationPolicy = String(cancellationPolicy || "");
    if (brochureImage !== undefined)
      updateData.brochureImage = String(brochureImage || "");
    if (brochureFile !== undefined)
      updateData.brochureFile = String(brochureFile || "");
    if (brochureId !== undefined) {
      updateData.brochureId =
        brochureId && String(brochureId).trim() ? brochureId : null;
    }

    // Interconnected trips config
    if (req.body.interconnection !== undefined) {
      const { parseInterconnectionBody } = await import(
        "../utils/interconnection.js"
      );
      updateData.interconnection = parseInterconnectionBody(req.body);
    }

    // ---------------------------
    // 🚀 UPDATE DB
    // ---------------------------
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (
      updatedTrip.interconnection?.enabled &&
      updatedTrip.interconnection.role === "stay"
    ) {
      const stayId = updatedTrip._id;
      const { outboundTrip, returnTrip, dayOffset } =
        updatedTrip.interconnection;
      if (outboundTrip) {
        await Trip.findByIdAndUpdate(outboundTrip, {
          $set: {
            "interconnection.enabled": true,
            "interconnection.role": "outbound",
            "interconnection.stayTrip": stayId,
            "interconnection.dayOffset": dayOffset || 1,
          },
        });
      }
      if (returnTrip) {
        await Trip.findByIdAndUpdate(returnTrip, {
          $set: {
            "interconnection.enabled": true,
            "interconnection.role": "return",
            "interconnection.stayTrip": stayId,
            "interconnection.dayOffset": dayOffset || 1,
          },
        });
      }
    }

    res.status(200).json(updatedTrip);
  } catch (error) {
    console.error("Update trip error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "ID not provided" });
    }
    const deletedTrip = await Trip.findByIdAndDelete(id);
    if (!deletedTrip)
      return res.status(404).json({ message: "Trip not found" });

    // Compact remaining preference indexes 1..N
    await ensureContiguousDisplayIndexes();

    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};