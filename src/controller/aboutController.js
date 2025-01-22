import { TryCatch } from "../middleware/error.js";

import ErrorHandler from "../utils/utilit-class.js";
import About from "../model/aboutModel.js";
// Create or Update About and Conditions
export const updateAbout = TryCatch(async (req, res, next) => {
    const { content } = req.body;
  
    if (!content) {
      return next(new ErrorHandler("Content is required.", 400));
    }
  
    // Check if About already exists
    let about = await About.findOne();
  
    if (about) {
      // Update existing About
      about.content = content;
      await about.save();
      return res.status(200).json({
        message: "About and Conditions updated successfully.",
        success: true,
      });
    }
  
    // If About does not exist, create a new record
    about = new About({ content });
    await about.save();
    return res.status(201).json({
      message: "About and Conditions created successfully.",
      success: true,
    });
  });
  

// Get About and Conditions
export const getAbout = TryCatch(async (req, res) => {
  const about = await About.findOne();

  if (!about) {
    return res.status(404).json({ message: "No About and Conditions found." });
  }

  res.status(200).json({ about });
});
