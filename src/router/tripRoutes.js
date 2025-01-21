// routes/tripRoutes.js
import express from 'express';
import { createTrip, deleteTrip, getAllTrips, getTripById, updateTrip } from '../controller/tripController.js';


const router = express.Router();

router.post('/', createTrip);
router.get('/', getAllTrips);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

export default router;
