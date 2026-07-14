import express from "express";
import {
  createPickupLocation,
  getAllPickupLocations,
  getPickupLocationById,
  updatePickupLocation,
  deletePickupLocation,
} from "../controller/pickupLocationController.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Public read so trip booking UIs can resolve labels if needed;
// admin write for create/update/delete
router.get("/", getAllPickupLocations);
router.get("/:id", getPickupLocationById);

router.post("/", isAuthenticated, adminOnly, createPickupLocation);
router.put("/:id", isAuthenticated, adminOnly, updatePickupLocation);
router.delete("/:id", isAuthenticated, adminOnly, deletePickupLocation);

export default router;
