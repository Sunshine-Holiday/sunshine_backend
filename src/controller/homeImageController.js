
import HomeImage from "../model/homeModel.js";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";

// Upload a new image
export const uploadHomeImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { mimetype, originalname, filename } = req.file;

    // Get the highest sequence number to append the new image at the end
    const lastImage = await HomeImage.findOne().sort({ sequence: -1 });
    const newSequence = lastImage ? lastImage.sequence + 1 : 0;

    const newImage = new HomeImage({
      path: `uploads/${filename}`,
      originalName: originalname,
      mimeType: mimetype,
      sequence: newSequence,
    });

    await newImage.save();

    res.status(201).json({
      message: "Image uploaded successfully",
      image: newImage,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Server error during image upload" });
  }
};

// Update image sequence
export const updateImageSequence = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { images } = req.body; // Array of { id, sequence }

    if (!Array.isArray(images) || images.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: "Invalid sequence data" });
    }

    // Validate input and check for duplicate sequences
    const sequenceSet = new Set();
    for (const { id, sequence } of images) {
      if (!id || typeof sequence !== "number") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: "Invalid image ID or sequence" });
      }
   if (sequenceSet.has(sequence)) {
  await session.abortTransaction();
  session.endSession();
  return res.status(400).json({ error: `Duplicate sequence value: ${sequence}` });
}
      sequenceSet.add(sequence);
    }

    // Fetch all images to validate IDs
    const imageIds = images.map(({ id }) => id);
    const existingImages = await HomeImage.find({ _id: { $in: imageIds } }).session(session);
if (existingImages.length !== images.length) {
  await session.abortTransaction();
  session.endSession();
  return res.status(404).json({ error: "One or more image IDs not found" });
}

    // Temporarily set sequences to negative values to avoid conflicts
    for (const image of existingImages) {
    image.sequence = -(image.sequence + 1); // Temporary unique negative value
      await image.save({ session });
    }

    // Update sequences to desired values
    for (const { id, sequence } of images) {
      await HomeImage.findByIdAndUpdate(
        id,
        { sequence },
        { session, runValidators: true }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Image sequence updated successfully" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating sequence:", error);
    res.status(500).json({ error: "Server error during sequence update" });
  }
};

// Delete an image
export const deleteHomeImage = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await HomeImage.findById(id);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete the file from the uploads directory
    const filePath = path.resolve(image.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the image record from the database
    await HomeImage.deleteOne({ _id: id });

    // Reorder remaining images to maintain contiguous sequence
    const remainingImages = await HomeImage.find().sort({ sequence: 1 });
    for (let i = 0; i < remainingImages.length; i++) {
      remainingImages[i].sequence = i;
      await remainingImages[i].save();
    }

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Server error during image deletion" });
  }
};

// Get all images
export const getHomeImages = async (req, res) => {
  try {
    const images = await HomeImage.find().sort({ sequence: 1 });
    res.status(200).json(images);
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ error: "Server error during image fetch" });
  }
};


