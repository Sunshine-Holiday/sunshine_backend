import { v2 as cloudinary } from "cloudinary";
import GalleryItem from "../model/GalleryItem.js";
import fs from "fs";

export const createGalleryItem = async (req, res) => {
  try {
    const { mediaType, location, date } = req.body;
    const file = req.file;

    // Log inputs for debugging
    console.log("req.file:", file);
    console.log("req.body:", req.body);

    // Validate inputs
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    if (!["image", "video"].includes(mediaType)) {
      return res.status(400).json({ message: "Invalid media type. Use 'image' or 'video'" });
    }
    if (!location || !date) {
      return res.status(400).json({ message: "Location and date are required" });
    }

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Explicitly map file properties
    const fileData = {
      originalName: file.originalname,
      path: file.path,
      mimeType: file.mimetype,
      size: file.size,
    };

    // Log mapped data for debugging
    console.log("Mapped file data:", fileData);

    // Create and save new gallery item
    const newItem = new GalleryItem({
      mediaType,
      ...fileData, // Spread fileData to match schema structure
      location,
      date: parsedDate,
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error in createGalleryItem:", error);
    res.status(500).json({ message: "Server error" });
  }
}; 
export const getGalleryItems = async (req, res) => {
  try {
    const items = await GalleryItem.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { mediaType, location, date } = req.body;

    const item = await GalleryItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (req.file) {
      const uploadedFile =
        mediaType === "image"
          ? await cloudinary.uploader.upload(req.file.path, {
              folder: "travels",
            })
          : await cloudinary.uploader.upload(req.file.path, {
              folder: "travels",
            });

      // Delete the uploaded file from the server after uploading to Cloudinary
      fs.unlinkSync(req.file.path);

      item.file = {
        public_id: uploadedFile.public_id,
        url: uploadedFile.secure_url,
      };
    }

    item.mediaType = mediaType || item.mediaType;
    item.location = location || item.location;
    item.date = date || item.date;

    await item.save();
    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(id);
    if (!id) {
      res.status(400).json({ message: "id is required" });
    }
    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Optional: Delete the media file from Cloudinary
    // await cloudinary.uploader.destroy(item.file.public_id);

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
