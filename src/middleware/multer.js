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
    const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "video/mp4",
        "video/webm",
        "video/avi"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = "Invalid file type. Only PNG, JPG, MP4, WebM, and AVI files are allowed.";
        cb(null, false);
    }
};

// Define separate limits for clarity
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for all files initially
    }
}).single('file');

// Custom middleware to handle dynamic file size limits
const dynamicFileSizeLimit = (req, res, next) => {
    if (!req.file) return next();
    
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB (example limit for videos)
    
    if (req.file.mimetype.startsWith('video/') && req.file.size > maxVideoSize) {
        return res.status(400).send({ 
            error: `Video file too large. Maximum size is ${maxVideoSize / (1024 * 1024)}MB` 
        });
    }
    if (req.file.mimetype.startsWith('image/') && req.file.size > maxImageSize) {
        return res.status(400).send({ 
            error: `Image file too large. Maximum size is ${maxImageSize / (1024 * 1024)}MB` 
        });
    }
    next();
};

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

// Export with dynamic size checking middleware
export default [upload, dynamicFileSizeLimit];