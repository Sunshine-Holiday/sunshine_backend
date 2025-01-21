import express from "express";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
import { getTerms, updateTerms } from "../controller/termsController.js";

const router = express.Router();

// Route for creating a blog (Admin only)
router.route("/create-terms").put(isAuthenticated, adminOnly, updateTerms);

// Route for getting all blogs
router.route("/").get(getTerms);

export default router;
