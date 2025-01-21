import { TryCatch } from "../middleware/error.js";
import Blog from "../model/blogModel.js";
import ErrorHandler from "../utils/utilit-class.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";  // Ensure fs is imported for file deletion

// Create a new blog with image upload to Cloudinary
export const createBlog = TryCatch(async (req, res, next) => {
  const { title, author, description } = req.body;
  const image = req.file?.path;
// console.log(req.body)
  if (!title || !author || !description) {
    return next(new ErrorHandler("Please fill in all the fields", 400));
  }

  const myCloud = await cloudinary.uploader.upload(image, {
    folder: "travels",
  });

  // Delete the image from the server after uploading to Cloudinary
  fs.unlinkSync(image);

  const blog = await Blog.create({
    title,
    author,
    description,
    userId: req.user.id,
    image: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  return res.status(201).json({
    message: "Blog created successfully",
    success: true,
    blog,
  });
});

// Get all blogs
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

// Get a blog by its ID
export const getBlogById = TryCatch(async (req, res, next) => {
  const { id } = req.params;
 if (!id) {
    return next(new ErrorHandler("id not found", 404));
 }
  const blog = await Blog.findById(id);

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  return res.status(200).json({
    message: "Blog retrieved successfully",
    blog,
  });
});

// Update a blog, including image update to Cloudinary
export const updateBlog = TryCatch(async (req, res, next) => {
  const { title, author, description } = req.body;
  const {id} = req.params;
  const image = req.file?.path;  // Check if there's a new image
  // console.log(image)
  // console.log("hello",req.body)
// console.log({ title, author, description })
  if (!title || !author || !description) {
    return next(new ErrorHandler("Please fill in all the fields", 400));
  }

  const blog = await Blog.findById(id);

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  let imageUpdate = null;
  if (image) {
    // Upload new image to Cloudinary
    const myCloud = await cloudinary.uploader.upload(image, {
      folder: "travels",
    });

    // Delete the old image from Cloudinary if it exists
    if (blog.image.public_id) {
      await cloudinary.uploader.destroy(blog.image.public_id);
    }

    // Delete the uploaded image from the server
    fs.unlinkSync(image);

    imageUpdate = {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  }

  // Update blog details
  const updatedBlog = await Blog.findByIdAndUpdate(
    id,
    {
      title,
      author,
      description,
      userId: req.user.id,
      image: imageUpdate || blog.image, // Keep old image if no new image is uploaded
    },
    { new: true } // Return the updated document
  );

  return res.status(200).json({
    message: "Blog updated successfully",
    blog: updatedBlog,
  });
});

// Delete a blog and its associated image from Cloudinary
export const deleteBlogById = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const blog = await Blog.findByIdAndDelete(id);

  if (!blog) {
    return next(new ErrorHandler("Blog not found", 404));
  }

  // Delete the image from Cloudinary
  if (blog.image.public_id) {
    await cloudinary.uploader.destroy(blog.image.public_id);
  }

  return res.status(200).json({
    message: "Blog deleted successfully",
    blog,
  });
});
