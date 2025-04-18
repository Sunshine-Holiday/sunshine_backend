// controllers/tripController.js

import Trip from "../model/Trip.js";

export const createTrip = async (req, res) => {
  try {
    const file = req.file;
    console.log(file);
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
            // First try to parse as JSON
            return JSON.parse(startDates);
          } catch (e) {
            // If that fails, try splitting by comma
            const dates = startDates.split(",").map(date => date.trim());
            
            // Check if the first item looks like it contains a JSON array 
            // (starts with [ and ends with ])
            if (dates.length === 1 && dates[0].startsWith('[') && dates[0].endsWith(']')) {
              try {
                return JSON.parse(dates[0]);
              } catch (e) {
                return dates;
              }
            }
            
            // Remove any extra quotes from each date
            return dates.map(date => date.replace(/^["']+|["']+$/g, ''));
          }
        })()
      : [];

    console.log({
      title,
      price,
      location,
      description,
      parsedStartDates,
      busSize,
      category,
      parsedAmenities,
      parsedBoardingPoints,
    });

    // Validate required fields
    if (
      !title ||
      !price ||
      !location ||
      !description ||
      !parsedStartDates ||
      !busSize ||
      !category ||

      !parsedBoardingPoints
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate boardingPoints
    // if (
    //   !Array.isArray(parsedBoardingPoints) ||
    //   parsedBoardingPoints.length === 0
    // ) {
    //   return res.status(400).json({
    //     message: "Boarding points must be an array with at least one entry",
    //   });
    // }

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
  const id= req.params.id
  console.log(id)
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
          // First try to parse as JSON
          return JSON.parse(startDates);
        } catch (e) {
          // If that fails, try splitting by comma
          const dates = startDates.split(",").map(date => date.trim());
          
          // Check if the first item looks like it contains a JSON array 
          // (starts with [ and ends with ])
          if (dates.length === 1 && dates[0].startsWith('[') && dates[0].endsWith(']')) {
            try {
              return JSON.parse(dates[0]);
            } catch (e) {
              return dates;
            }
          }
          
          // Remove any extra quotes from each date
          return dates.map(date => date.replace(/^["']+|["']+$/g, ''));
        }
      })()
    : [];

   
  console.log({
    title,
    price,
    location,
    description,
    parsedStartDates,
    busSize,
    category,
    parsedAmenities,
    parsedBoardingPoints,
  });

  // Validate required fields
  if (
    !title ||
    !price ||
    !location ||
    !description ||
    !parsedStartDates ||
    !busSize ||
    !category ||

    !parsedBoardingPoints
  ) {
    console.log({
      title,
      price,
      location,
      description,
      parsedStartDates,
      busSize,
      category,
      parsedAmenities,
      parsedBoardingPoints,
    });
    console.log("dasd")
    return res.status(400).json({ message: "Missing required fields " });
  }

  // Further validation for boardingPoints (must be an array with at least one element)
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
    console.log(id);
    if (!id) {
      res.status(401).json({ message: "id not found" });
    }
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);

    if (!deletedTrip)
      return res.status(404).json({ message: "Trip not found" });
    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
