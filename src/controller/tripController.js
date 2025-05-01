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
      busSize,
      category,
      amenities,
      boardingPoints,
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

    // Validate startDates format and content
    if (!Array.isArray(parsedStartDates) || parsedStartDates.length === 0) {
      return res.status(400).json({ message: "Start dates must be a non-empty array" });
    }

    for (const startDate of parsedStartDates) {
      if (!startDate.date || !startDate.seats) {
        return res.status(400).json({ message: "Each start date must have a date and seats" });
      }
      if (
        !(
          (typeof startDate.seats === "number" && [20, 32].includes(startDate.seats)) ||
          startDate.seats === "block"
        )
      ) {
        return res.status(400).json({ message: "Seats must be 20, 32, or 'block'" });
      }
    }

    // Validate required fields
    if (
      !title ||
      !price ||
      !location ||
      !description ||
      !busSize ||
     !category ||
      !parsedBoardingPoints.length === 0
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate boardingPoints
    if (
      !Array.isArray(parsedBoardingPoints) ||
      parsedBoardingPoints.length === 0
    ) {
      return res.status(400).json({
        message: "Boarding points must be an array with at least one entry",
      });
    }

    const trip = new Trip({
      banner: file.path,
      title,
      price,
      location,
      description,
      startDates: parsedStartDates,
      busSize,
      category,
      amenities: parsedAmenities,
      boardingPoints: parsedBoardingPoints,
    });

    const savedTrip = await trip.save();
    res.status(201).json(savedTrip);
  } catch (error) {
    console.log(error);
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
    res.status(200).json(trip);
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
    busSize,
    category,
    amenities,
    boardingPoints,
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

  // Validate startDates format and content
  if (!Array.isArray(parsedStartDates) || parsedStartDates.length === 0) {
    return res.status(400).json({ message: "Start dates must be a non-empty array" });
  }

  for (const startDate of parsedStartDates) {
    if (!startDate.date || !startDate.seats) {
      return res.status(400).json({ message: "Each start date must have a date and seats" });
    }
    if (
      !(
        (typeof startDate.seats === "number" && [20, 32].includes(startDate.seats)) ||
        startDate.seats === "block"
      )
    ) {
      return res.status(400).json({ message: "Seats must be 20, 32, or 'block'" });
    }
  }

  // Validate required fields
  if (
    !title ||
    !price ||
    !location ||
    !description ||
    !busSize ||
    !category ||
    !parsedBoardingPoints.length
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Validate boardingPoints
  if (
    !Array.isArray(parsedBoardingPoints) ||
    parsedBoardingPoints.length === 0
  ) {
    return res.status(400).json({
      message: "Boarding points must be an array with at least one entry",
    });
  }

  try {
    const updatedTrip = await Trip.findByIdAndUpdate(
      id,
      {
        banner: file?.path,
        title,
        price,
        location,
        description,
        startDates: parsedStartDates,
        busSize,
        category,
        amenities: parsedAmenities,
        boardingPoints: parsedBoardingPoints,
      },
      {
        new: true,
      }
    );
    if (!updatedTrip)
      return res.status(404).json({ message: "Trip not found" });
    res.status(200).json(updatedTrip);
  } catch (error) {
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