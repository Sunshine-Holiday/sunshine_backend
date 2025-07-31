import Review from "../model/Review.js";
import Trip from "../model/Trip.js";

export const createTrip = async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.path) {
      return res.status(400).json({ message: "Image required" });
    }

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
    if (parsedStartDates.length === 0) {
      return res.status(400).json({ message: "At least one start date is required" });
    }
    if (parsedBoardingPoints.length === 0) {
      return res.status(400).json({ message: "At least one boarding point is required" });
    }

    // Validate price and packages
    const parsedPrice = price ? parseFloat(price) : 0;
    if (parsedPackages.length === 0 && (!parsedPrice || parsedPrice <= 0)) {
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
        if (!room.personCount || !Number.isInteger(room.personCount) || room.personCount <= 0) {
          return res.status(400).json({ message: "Room choice person count must be a positive integer" });
        }
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
    discountPercentage
  } = req.body;

  const file = req.file;

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
  if (title && !title) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (location && !location) {
    return res.status(400).json({ message: "Location is required" });
  }
  if (description && !description) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (category && !category) {
    return res.status(400).json({ message: "Category is required" });
  }
  if (parsedStartDates.length > 0) {
    for (const startDate of parsedStartDates) {
      if (startDate.seats !== undefined && startDate.seats !== "block" && (!Number.isInteger(startDate.seats) || startDate.seats <= 0)) {
        return res.status(400).json({ message: "Seats must be a positive integer if provided" });
      }
    }
  } else {
    return res.status(400).json({ message: "At least one start date is required" });
  }
  if (parsedBoardingPoints.length === 0) {
    return res.status(400).json({ message: "At least one boarding point is required" });
  }

  // Validate price and packages
  const parsedPrice = price ? parseFloat(price) : 0;
  if (parsedPackages.length === 0 && (!parsedPrice || parsedPrice <= 0)) {
    return res.status(400).json({ message: "Price is required when no packages are provided" });
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
      if (!room.personCount || !Number.isInteger(room.personCount) || room.personCount <= 0) {
        return res.status(400).json({ message: "Room choice person count must be a positive integer" });
      }
      if (!room.roomCount || !Number.isInteger(room.roomCount) || room.roomCount <= 0) {
        return res.status(400).json({ message: "Room choice room count must be a positive integer" });
      }
      if (!room.price || isNaN(room.price) || room.price <= 0) {
        return res.status(400).json({ message: "Room choice price must be a positive number" });
      }
    }
  }

  // Construct update object with only provided fields
  const updateData = {};
  if (file?.path) updateData.banner = file.path;
  if (title) updateData.title = title;
  if (parsedPrice > 0) updateData.price = parsedPrice;
  if (location) updateData.location = location;
  if (description) updateData.description = description;
  if (parsedStartDates.length > 0) updateData.startDates = parsedStartDates;
  if (category) updateData.category = category;
  if (parsedAmenities.length > 0) updateData.amenities = parsedAmenities;
  if (parsedBoardingPoints.length > 0) updateData.boardingPoints = parsedBoardingPoints;
  if (parsedPackages.length > 0) updateData.packages = parsedPackages;
  if (parsedRoomChoices.length > 0) updateData.roomChoices = parsedRoomChoices;
if (typeof advancePaymentPercentage !== "undefined") {
  updateData.advancePaymentPercentage = advancePaymentPercentage;
}
if (typeof discountPercentage !== "undefined") {
  updateData.discountPercentage = discountPercentage;
}
  try {
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
    console.error("Error updating trip:", error);
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