import express from "express";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlogById,
} from "../controller/blogController.js";

const router = express.Router();

// Route for creating a blog (Admin only)
router.route("/create-blogs").post(isAuthenticated, adminOnly, createBlog);

// Route for getting all blogs
router.route("/blogs").get(getAllBlogs);

// Route for getting a specific blog by ID
router.route("/blog/:id").get(getBlogById);

// Route for updating a blog by ID (Admin only)
router.route("/update-blog/:id").put(isAuthenticated, adminOnly, updateBlog);

// Route for deleting a blog by ID (Admin only)
router
  .route("/delete-blog/:id")
  .delete(isAuthenticated, adminOnly, deleteBlogById);

export default router;
