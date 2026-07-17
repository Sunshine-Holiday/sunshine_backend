import Brochure from "../model/Brochure.js";
import { deleteImage } from "../utils/utilit-class.js";

export const createBrochure = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const file = req.file;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Brochure title is required",
      });
    }
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Brochure image is required",
      });
    }

    if (!file.mimetype?.startsWith("image/")) {
      deleteImage(file.path);
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed for brochures",
      });
    }

    const brochure = await Brochure.create({
      title,
      image: file.path,
      originalName: file.originalname || "",
    });

    return res.status(201).json({
      success: true,
      message: "Brochure created successfully",
      brochure,
    });
  } catch (error) {
    console.error("createBrochure:", error);
    if (req.file?.path) deleteImage(req.file.path);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create brochure",
    });
  }
};

export const getAllBrochures = async (_req, res) => {
  try {
    const brochures = await Brochure.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      brochures,
      count: brochures.length,
    });
  } catch (error) {
    console.error("getAllBrochures:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch brochures",
    });
  }
};

export const getBrochureById = async (req, res) => {
  try {
    const brochure = await Brochure.findById(req.params.id);
    if (!brochure) {
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }
    return res.status(200).json({ success: true, brochure });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch brochure",
    });
  }
};

export const updateBrochure = async (req, res) => {
  try {
    const brochure = await Brochure.findById(req.params.id);
    if (!brochure) {
      if (req.file?.path) deleteImage(req.file.path);
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }

    const title = req.body?.title !== undefined
      ? String(req.body.title).trim()
      : brochure.title;

    if (!title) {
      if (req.file?.path) deleteImage(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Brochure title is required",
      });
    }

    brochure.title = title;

    if (req.file) {
      if (!req.file.mimetype?.startsWith("image/")) {
        deleteImage(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed for brochures",
        });
      }
      const oldPath = brochure.image;
      brochure.image = req.file.path;
      brochure.originalName = req.file.originalname || brochure.originalName;
      if (oldPath && oldPath !== req.file.path) deleteImage(oldPath);
    }

    await brochure.save();

    return res.status(200).json({
      success: true,
      message: "Brochure updated successfully",
      brochure,
    });
  } catch (error) {
    console.error("updateBrochure:", error);
    if (req.file?.path) deleteImage(req.file.path);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update brochure",
    });
  }
};

export const deleteBrochure = async (req, res) => {
  try {
    const brochure = await Brochure.findByIdAndDelete(req.params.id);
    if (!brochure) {
      return res.status(404).json({
        success: false,
        message: "Brochure not found",
      });
    }
    if (brochure.image) deleteImage(brochure.image);
    return res.status(200).json({
      success: true,
      message: "Brochure deleted successfully",
    });
  } catch (error) {
    console.error("deleteBrochure:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete brochure",
    });
  }
};
