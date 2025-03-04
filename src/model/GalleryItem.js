import mongoose from "mongoose";

const galleryItemSchema = new mongoose.Schema(
  {
    mediaType: { type: String, required: true, enum: ["image", "video"] },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);
const GalleryItem = mongoose.model("GalleryItem", galleryItemSchema);

export default GalleryItem;
