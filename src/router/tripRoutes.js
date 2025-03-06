// routes/tripRoutes.js
import express from 'express';
import { createTrip, deleteTrip, getAllTrips, getTripById, updateTrip } from '../controller/tripController.js';
import { adminOnly, isAuthenticated } from '../middleware/auth.js';
import upload from "../middleware/multer.js";

const router = express.Router();

router.post('/',isAuthenticated,adminOnly,upload, createTrip);
router.get('/', getAllTrips);
router.get('/:id', getTripById);
router.put('/:id',isAuthenticated,adminOnly,upload, updateTrip);
router.delete('/trip/:id', isAuthenticated,adminOnly,deleteTrip);

export default router;
