import express from "express";
import {
  getDriverLocations,
  updateMyDriverLocation,
} from "../controller/driverTrackingController.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.put("/location", isAuthenticated, updateMyDriverLocation);
router.get("/", isAuthenticated, adminOnly, getDriverLocations);

export default router;
