import express from "express";
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItems,
  updateGalleryItem,
} from "../controller/galleryController.js";
import upload from "../middleware/multer.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
const router = express.Router();

// Routes for gallery
router.get("/", getGalleryItems);
router.post("/", isAuthenticated, adminOnly, upload, createGalleryItem);
router.put("/:id", isAuthenticated, adminOnly, upload, updateGalleryItem);
router.delete("/:id", deleteGalleryItem);

export default router;
