
import express from "express";
import { uploadHomeImage, updateImageSequence, deleteHomeImage, getHomeImages } from "../controller/homeImageController.js";
import uploadMiddleware, { fileUploadErrorHandler } from "../middleware/multer.js";

const router = express.Router();

// Upload a new image
router.post("/upload", uploadMiddleware, uploadHomeImage, fileUploadErrorHandler);

// Update image sequence
router.put("/sequence", updateImageSequence);

// Delete an image
router.delete("/:id", deleteHomeImage);

// Get all images
router.get("/", getHomeImages);

export default router;
