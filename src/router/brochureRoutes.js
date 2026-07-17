import express from "express";
import {
  createBrochure,
  getAllBrochures,
  getBrochureById,
  updateBrochure,
  deleteBrochure,
} from "../controller/brochureController.js";
import upload from "../middleware/multer.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// Public list so trip forms / public site can resolve brochure images
router.get("/", getAllBrochures);
router.get("/:id", getBrochureById);

router.post("/", isAuthenticated, adminOnly, upload, createBrochure);
router.put("/:id", isAuthenticated, adminOnly, upload, updateBrochure);
router.delete("/:id", isAuthenticated, adminOnly, deleteBrochure);

export default router;
