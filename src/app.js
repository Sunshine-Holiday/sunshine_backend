import { config } from "dotenv";
import express from "express";
import { connectDB } from "./utils/db.js";
import cors from "cors";
import { errorMiddleware } from "./middleware/error.js";
import userRouter from "./router/userRoute.js";

config();
const app = express();
connectDB(process.env.MONGO_URI);
const PORT = process.env.PORT;
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://clothing-eccomerce.vercel.app",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies/credentials to be included in the request
  methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
};
app.use(express.json());
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("<h1>Server is working</h1>");
  res.status(err.statusCode).json({
    success: false,
    message: "hello world",
  });
});
app.use("/api/v1/user", userRouter);
app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);
app.listen(PORT, () => console.log("server is working port", PORT));
