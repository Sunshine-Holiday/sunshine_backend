import { TryCatch } from "../middleware/error.js";
import Terms from "../model/termsModel.js";
import ErrorHandler from "../utils/utilit-class.js";

// Create or Update Terms and Conditions
export const updateTerms = TryCatch(async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next(new ErrorHandler("Content is required.", 400));
  }

  // Check if terms already exist (find first document)
  let terms = await Terms.findOne();

  if (terms) {
    // Update existing terms using the first found document's ID
    await Terms.findByIdAndUpdate(
      terms._id,
      { content },
      { new: true, runValidators: true }
    );
    return res.status(200).json({
      message: "Terms and Conditions updated successfully.",
      success: true,
    });
  }

  // If terms don't exist, create new terms
  terms = await Terms.create({ content });
  return res.status(201).json({
    message: "Terms and Conditions created successfully.",
    success: true,
  });
});

// Get Terms and Conditions
export const getTerms = TryCatch(async (req, res) => {
  const terms = await Terms.findOne();

  if (!terms) {
    return res.status(404).json({ message: "No Terms and Conditions found." });
  }

  res.status(200).json({ terms });
});
