import { TryCatch } from "../middleware/error.js";
import Terms from "../model/termsModel.js";
import ErrorHandler from "../utils/utilit-class.js";

// Create or Update Terms and Conditions
export const updateTerms = TryCatch(async (req, res, next) => {
  const { content } = req.body;

  if (!content) {
    return next(new ErrorHandler("Content is required.", 400));
  }

  // Check if terms already exist
  let terms = await Terms.findOne();

  if (terms) {
    // Update existing terms
    terms.content = content;
    await terms.save();
    return res.status(200).json({
      message: "Terms and Conditions updated successfully.",
      success: true,
    });
  }

  // If terms do not exist, respond with an error
  return res.status(404).json({
    message: "Terms and Conditions not found.",
    success: false,
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
