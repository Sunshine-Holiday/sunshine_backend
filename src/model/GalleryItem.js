import mongoose from "mongoose";

const galleryItemSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      required: true,
      enum: ["image", "video"],
    },
    file: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    location: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const GalleryItem = mongoose.model("GalleryItem", galleryItemSchema);

export default GalleryItem;
