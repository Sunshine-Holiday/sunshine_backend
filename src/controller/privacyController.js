import { TryCatch } from "../middleware/error.js";
import Privacy from "../model/privacy.js";

import ErrorHandler from "../utils/utilit-class.js";

// Create or Update privacy and Conditions
export const updateprivacy = TryCatch(async (req, res, next) => {
    const { content } = req.body;
  
    if (!content) {
      return next(new ErrorHandler("Content is required.", 400));
    }
  
    // Check if privacy already exists
    let privacy = await Privacy.findOne();
  
    if (privacy) {
      // Update existing privacy
      privacy.content = content;
      await privacy.save();
      return res.status(200).json({
        message: "privacy and Conditions updated successfully.",
        success: true,
      });
    }
  
    // If privacy does not exist, create a new record
    privacy = new Privacy({ content });
    await privacy.save();
    return res.status(201).json({
      message: "privacy and Conditions created successfully.",
      success: true,
    });
  });
  

// Get privacy and Conditions
export const getprivacy = TryCatch(async (req, res) => {
  const privacy = await Privacy.findOne();

  if (!privacy) {
    return res.status(404).json({ message: "No privacy and Conditions found." });
  }

  res.status(200).json({ privacy });
});
