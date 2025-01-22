import express from "express";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
import { getAbout, updateAbout } from "../controller/aboutController.js";

const router = express.Router();

// Route for creating a blog (Admin only)
router.route("/").put(isAuthenticated, adminOnly, updateAbout);

// Route for getting all blogs
router.route("/").get(getAbout);

export default router;
