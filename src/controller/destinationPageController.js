import DestinationPage from "../model/DestinationPage.js";
import { deleteImage } from "../utils/utilit-class.js";

const normalizeSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getDestinationPages = async (_req, res) => {
  try {
    const destinations = await DestinationPage.find().sort({ name: 1 });
    return res.status(200).json({ success: true, destinations });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch destination pages",
    });
  }
};

export const getDestinationPage = async (req, res) => {
  try {
    const destination = await DestinationPage.findOne({
      slug: normalizeSlug(req.params.slug),
    });

    // A missing override is valid: the frontend falls back to trip data.
    return res.status(200).json({ success: true, destination });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch destination page",
    });
  }
};

export const upsertDestinationPage = async (req, res) => {
  const uploadedPath = req.file?.path;

  try {
    const slug = normalizeSlug(req.params.slug);
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!slug || !name) {
      if (uploadedPath) deleteImage(uploadedPath);
      return res.status(400).json({
        success: false,
        message: "Destination name is required",
      });
    }

    if (req.file && !req.file.mimetype?.startsWith("image/")) {
      deleteImage(uploadedPath);
      return res.status(400).json({
        success: false,
        message: "Destination banner must be an image",
      });
    }

    const existing = await DestinationPage.findOne({ slug });
    const previousBanner = existing?.banner;
    const update = { slug, name, description };
    if (uploadedPath) update.banner = uploadedPath;

    const destination = await DestinationPage.findOneAndUpdate(
      { slug },
      { $set: update },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (uploadedPath && previousBanner && previousBanner !== uploadedPath) {
      deleteImage(previousBanner);
    }

    return res.status(existing ? 200 : 201).json({
      success: true,
      message: "Destination banner saved successfully",
      destination,
    });
  } catch (error) {
    if (uploadedPath) deleteImage(uploadedPath);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save destination page",
    });
  }
};
