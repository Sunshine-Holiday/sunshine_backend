import { config } from "dotenv";
import express from "express";
import Razorpay from "razorpay";
import { connectDB } from "./utils/db.js";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import { errorMiddleware } from "./middleware/error.js";
import userRouter from "./router/userRoute.js";
import blogRouter from "./router/blogRouter.js";
import createRouter from "./router/Terms.js";
import { fileUploadErrorHandler } from "./middleware/multer.js";
config();
const app = express();
connectDB(process.env.MONGO_URI);
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const PORT = process.env.PORT;
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies/credentials to be included in the request
  methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
};
app.use(express.json({ limit: '10mb' }));
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("<h1>Server is working</h1>");
  res.status(err.statusCode).json({
    success: false,
    message: "hello world",
  });
});
app.use("/api/v1/user", userRouter);
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/terms", createRouter);
app.use("/uploads", express.static("uploads"));
app.use(fileUploadErrorHandler);
app.use(errorMiddleware);
app.listen(PORT, () => console.log("server is working port", PORT));
