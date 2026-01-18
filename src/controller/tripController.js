import Review from "../model/Review.js";
import Trip from "../model/Trip.js";

export const createTrip = async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.path) {
      return res.status(400).json({ message: "Image required" });
    }

    const {
      readonly,
      title,
      price,
      location,
      description,
      startDates,
      category,
      amenities,
      boardingPoints,
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
    if (description) tripData.description = description;
    if (parsedStartDates.length > 0) tripData.startDates = parsedStartDates;
    if (category) tripData.category = category;
    if (parsedAmenities.length > 0) tripData.amenities = parsedAmenities;
    if (parsedBoardingPoints.length > 0) tripData.boardingPoints = parsedBoardingPoints;
    if (parsedPackages.length > 0) tripData.packages = parsedPackages;
    if (parsedRoomChoices.length > 0) tripData.roomChoices = parsedRoomChoices;
 
    if (typeof advancePaymentPercentage !== "undefined") {
      tripData.advancePaymentPercentage = advancePaymentPercentage;
    }
    if (typeof discountPercentage !== "undefined") {
      tripData.discountPercentage = discountPercentage;
    }
    const trip = new Trip(tripData);
    const savedTrip = await trip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ message: error.message });
  }
};
export const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    res.status(200).json({ trip, reviews });
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
      description,
      startDates,
      category,
      amenities,
      boardingPoints,
      packages,
      roomChoices,
      advancePaymentPercentage,
      discountPercentage,
      readonly,
    } = req.body;

    const file = req.file;

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
      description,
      category,
      price: parsedPrice,
      startDates: parsedStartDates,
      amenities: parsedAmenities,
      boardingPoints: parsedBoardingPoints,
      packages: parsedPackages,     // ✅ empty array allowed
      roomChoices: parsedRoomChoices, // ✅ empty array allowed
    };

    if (file?.path) {
      updateData.banner = file.path;
    }

    if (advancePaymentPercentage !== undefined) {
      updateData.advancePaymentPercentage = advancePaymentPercentage;
    }

    if (discountPercentage !== undefined) {
      updateData.discountPercentage = discountPercentage;
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
      res.status(400).json({ message: "ID not provided" });
    }
    const deletedTrip = await Trip.findByIdAndDelete(id);
    if (!deletedTrip)
      return res.status(404).json({ message: "Trip not found" });
    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};