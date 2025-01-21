// controllers/tripController.js

import Trip from "../model/Trip.js";


export const createTrip = async (req, res) => {
    try {
      const { 
        title, 
        price, 
        location, 
        duration, 
        startDates, 
        busSize, 
        category, 
        amenities, 
        boardingPoints 
      } = req.body;
 
      // Validate required fields
      if (!title || !price || !location || !duration || !startDates || !busSize || !category || !amenities || !boardingPoints) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
      // Further validation for boardingPoints (must be an array with at least one element)
      if (!Array.isArray(boardingPoints) || boardingPoints.length === 0) {
        return res.status(400).json({ message: 'Boarding points must be an array with at least one entry' });
      }

      // Create a new trip if all required fields are present
      const trip = new Trip(req.body);
      const savedTrip = await trip.save();
      res.status(201).json(savedTrip);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  };
  

export const getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find();
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTrip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json(updatedTrip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTrip = async (req, res) => {
  try {
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    if (!deletedTrip) return res.status(404).json({ message: 'Trip not found' });
    res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
