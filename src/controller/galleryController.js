import { v2 as cloudinary } from "cloudinary";
import GalleryItem from "../model/GalleryItem.js";
import fs from "fs";

export const createGalleryItem = async (req, res) => {
  try {
    const { mediaType, location, date } = req.body;
    const file = req.file;
    console.log(file, req.body);
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    let uploadedFile;
    if (mediaType === "image") {
      uploadedFile = await cloudinary.uploader.upload(file.path, {
        folder: "travels",
      });
    } else if (mediaType === "video") {
      uploadedFile = await cloudinary.uploader.upload(file.path, {
        folder: "travels",
      });
    }

    // Delete the uploaded file from the local server
    fs.unlinkSync(file.path);

    const newItem = new GalleryItem({
      mediaType,
      file: {
        public_id: uploadedFile.public_id,
        url: uploadedFile.secure_url,
      },
      location,
      date,
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getGalleryItems = async (req, res) => {
  try {
    const items = await GalleryItem.find();
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
    console.log(id);
    const item = await GalleryItem.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Optional: Delete the media file from Cloudinary
    await cloudinary.uploader.destroy(item.file.public_id);

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
