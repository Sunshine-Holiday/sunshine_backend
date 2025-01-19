import mongoose, { Schema } from "mongoose";

const blogSchema = new Schema(
  {
    title: {
      type: String,
      required: true, 
    },
    description: {
      type: String,
      required: true, 
    },
    author: {
      type: String,
      required: true, 
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "user", 
      required: true, 
    },
  },
  {
    timestamps: true, 
  }
);

const Blog = mongoose.model("blog", blogSchema);

export default Blog;
