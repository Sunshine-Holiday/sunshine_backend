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
    // Avoid collisions when multiple files upload in the same ms
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "video/mp4",
    "video/webm",
    "video/avi",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    req.fileValidationError =
      "Invalid file type. Only PNG, JPG, MP4, WebM, and AVI files are allowed.";
    cb(null, false);
  }
};

const multerBase = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

const uploadSingle = multerBase.single("file");

/** Trip banners: primary `file` (legacy) + extra `banners` images */
const uploadTripFields = multerBase.fields([
  { name: "file", maxCount: 1 },
  { name: "banners", maxCount: 12 },
]);

const collectUploadedFiles = (req) => {
  const list = [];
  if (req.file) list.push(req.file);
  if (Array.isArray(req.files)) {
    list.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    if (Array.isArray(req.files.file)) list.push(...req.files.file);
    if (Array.isArray(req.files.banners)) list.push(...req.files.banners);
  }
  return list;
};

// Size limits for single-file uploads
const dynamicFileSizeLimit = (req, res, next) => {
  if (!req.file) return next();

  const maxImageSize = 10 * 1024 * 1024;
  const maxVideoSize = 100 * 1024 * 1024;

  if (req.file.mimetype.startsWith("video/") && req.file.size > maxVideoSize) {
    return res.status(400).send({
      error: `Video file too large. Maximum size is ${maxVideoSize / (1024 * 1024)}MB`,
    });
  }
  if (req.file.mimetype.startsWith("image/") && req.file.size > maxImageSize) {
    return res.status(400).send({
      error: `Image file too large. Maximum size is ${maxImageSize / (1024 * 1024)}MB`,
    });
  }
  next();
};

// Size limits for multi-file trip uploads + normalize req.file to first image
const dynamicTripFileSizeLimit = (req, res, next) => {
  const files = collectUploadedFiles(req);
  const maxImageSize = 10 * 1024 * 1024;

  for (const f of files) {
    if (f.mimetype?.startsWith("image/") && f.size > maxImageSize) {
      return res.status(400).send({
        error: `Image file too large. Maximum size is ${maxImageSize / (1024 * 1024)}MB`,
      });
    }
  }

  // Controllers that still read req.file keep working
  if (!req.file && files.length > 0) {
    req.file = files[0];
  }
  // Convenient list for trip controller
  req.uploadedFiles = files;
  next();
};

export const fileUploadErrorHandler = (err, req, res, next) => {
  if (req.fileValidationError) {
    return res.status(400).send({ error: req.fileValidationError });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).send({ error: err.message });
  }
  next(err);
};

/** Default: single field "file" (gallery, brochure, profile, etc.) */
export default [uploadSingle, dynamicFileSizeLimit];

/** Multi-banner trip create/update */
export const uploadTripBanners = [uploadTripFields, dynamicTripFileSizeLimit];

export { collectUploadedFiles };
