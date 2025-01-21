import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure the uploads directory exists
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "video/mp4" ||
    file.mimetype === "video/webm" ||
    file.mimetype === "video/avi"
  ) {
    cb(null, true);
  } else {
    req.fileValidationError = "Invalid file type. Only PNG, JPG, MP4, WebM, and AVI files are allowed.";
    cb(null, false);
  }
};

// File size limit configuration, with dynamic limit based on file type
const upload = multer({
  storage,
  fileFilter,
  limits: (req, file) => {
    if (file.mimetype.startsWith("video/")) {
      // No limit for video files
      return { fileSize: Infinity }; 
    } else {
      // Limit for images (10MB)
      return { fileSize: 10 * 1024 * 1024 };
    }
  },
}).single('file');

// Error handling middleware
export const fileUploadErrorHandler = (err, req, res, next) => {
  if (req.fileValidationError) {
    return res.status(400).send({ error: req.fileValidationError });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).send({ error: err.message });
  }
  next(err);
};

export default upload;
