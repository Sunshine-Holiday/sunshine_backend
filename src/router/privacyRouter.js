import express from "express";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
import { getprivacy,updateprivacy } from "../controller/privacyController.js";

const privacyRouter = express.Router();

// Route for creating a blog (Admin only)
privacyRouter.route("/").put(isAuthenticated, adminOnly, updateprivacy);

// Route for getting all blogs
privacyRouter.route("/").get(getprivacy);

export default privacyRouter;
