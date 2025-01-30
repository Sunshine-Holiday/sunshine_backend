// routes/tripRoutes.js
import express from 'express';
import { createTrip, deleteTrip, getAllTrips, getTripById, updateTrip } from '../controller/tripController.js';
import { adminOnly, isAuthenticated } from '../middleware/auth.js';


const router = express.Router();

router.post('/',isAuthenticated,adminOnly, createTrip);
router.get('/', getAllTrips);
router.get('/:id', getTripById);
router.put('/:id',isAuthenticated,adminOnly, updateTrip);
router.delete('/:id', isAuthenticated,adminOnly,deleteTrip);

export default router;
