import { config } from "dotenv";
import express from "express";
import Razorpay from "razorpay";
import { connectDB } from "./utils/db.js";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import { errorMiddleware } from "./middleware/error.js";
import { fileUploadErrorHandler } from "./middleware/multer.js";

// Importing Routes
import homeRouter from "./router/homeImageRoutes.js";
import userRouter from "./router/userRoute.js";
import blogRouter from "./router/blogRouter.js";
import createRouter from "./router/Terms.js";
import galleryRouter from "./router/galleryRoutes.js";
import tripRoutes from "./router/tripRoutes.js";
import bookingRouter from "./router/booking.js";
import aboutRouter from "./router/aboutRouter.js";
import paymentRouter from "./router/payment.js";
import privacyRouter from "./router/privacyRouter.js";
import reviewRouter from "./router/reviewRoutes.js";
import specialSectionRoutes from "./router/specialSectionRoutes.js";
import pickupLocationRoutes from "./router/pickupLocationRoutes.js";
config();
const app = express();
const PORT = process.env.PORT;

// Database Connection
connectDB(process.env.MONGO_URI);

// Razorpay Configuration
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("SMTP_USER",process.env.SMTP_USER,);
// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL2,
      process.env.FRONTEND_URL3,
      "http://localhost:5173"
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      // console.log("Request Origin:", origin);
      // console.log("Allowed Origins:", allowedOrigins);
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
};

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(cors(corsOptions));
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => res.send("<h1>Server is working</h1>"));
app.use("/api/v1/home", homeRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/terms", createRouter);
app.use("/api/v1/gallery", galleryRouter);
app.use("/api/v1/about", aboutRouter);
app.use("/api/v1/privacy", privacyRouter);
app.use("/api/v1/booking", bookingRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/special-sections", specialSectionRoutes);
app.use("/api/v1/pickup-locations", pickupLocationRoutes);
// Error Handling
// app.use(fileUploadErrorHandler);
app.use(errorMiddleware);

// Start Server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));