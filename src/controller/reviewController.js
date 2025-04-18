// controllers/reviewController.js
import Review from "../model/Review.js";
import Booking from "../model/booking.js";

export const createReview = async (req, res) => {
    try {
      const { bookingId, description } = req.body;
      const userId = req.user._id;
  
      const booking = await Booking.findById(bookingId)
        .populate("trip")
        .populate("user");
  
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
  
      if (booking.user._id.toString() !== userId.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }
  
      // Parse the selected date (format: 'DD-MM-YYYY')
      const [day, month, year] = booking.selectedDate.split('-');
      const travelDate = new Date(`${year}-${month}-${day}`);
      const today = new Date();
  
      // Strip time
      const travelDay = new Date(travelDate.toDateString());
      const currentDay = new Date(today.toDateString());
  
      if (travelDay > currentDay) {
        return res.status(400).json({ error: "You can only review after the trip" });
      }
  
      const alreadyReviewed = await Review.findOne({
        user: userId,
        booking: bookingId,
      });
  
      if (alreadyReviewed) {
        return res.status(400).json({ error: "Review already submitted" });
      }
  
      const newReview = await Review.create({
        trip: booking.trip._id,
        user: userId,
        booking: booking._id,
        travelDate,
        description,
      });
  
      res.status(201).json(newReview);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
export const getTripReviews = async (req, res) => {
  try {
    const { tripId } = req.params;

    const reviews = await Review.find({ trip: tripId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
