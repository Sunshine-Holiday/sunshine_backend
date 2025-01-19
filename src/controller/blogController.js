import { TryCatch } from "../middleware/error.js";
import Blog from "../model/blogModel.js";
import ErrorHandler from "../utils/utilit-class.js";

export const createBlog = TryCatch(async (req, res, next) => {
  const { title, author, description } = req.body;

  if (!title || !author || !description) {
    return next(new ErrorHandler("Please fill in all the fields", 400));
  }

  const blog = await Blog.create({
    title,
    author,
    description,
    userId: req.user.id,
  });

  return res.status(201).json({
    message: "Blog created successfully",
    success: true,
    blog,
  });
});

export const getAllBlogs = TryCatch(async (req, res, next) => {
  const blogs = await Blog.find();

  if (!blogs || blogs.length === 0) {
    return next(new ErrorHandler("No blogs found", 404));
  }

  return res.status(200).json({
    message: "All blogs retrieved successfully",
    blogs,
  });
});

export const getBlogById = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const blog = await Blog.findById(id);

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  return res.status(200).json({
    message: "Blog retrieved successfully",
    blog,
  });
});

export const updateBlog = TryCatch(async (req, res, next) => {
  const { title, author, description } = req.body;
  const { id } = req.params;

  if (!title || !author || !description) {
    return next(new ErrorHandler("Please fill in all the fields", 400));
  }

  const blog = await Blog.findByIdAndUpdate(
    id,
    { title, author, description, userId: req.user.id },
    { new: true } // Return the updated document
  );

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  return res.status(200).json({
    message: "Blog updated successfully",
    blog,
  });
});

export const deleteBlogById = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const blog = await Blog.findByIdAndDelete(id);

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  return res.status(200).json({
    message: "Blog deleted successfully",
    blog,
  });
});
