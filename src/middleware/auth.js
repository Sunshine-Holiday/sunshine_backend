import jwt from "jsonwebtoken";

import User from "../model/userModel.js";
import { TryCatch } from "./error.js";
import ErrorHandler from "../utils/utilit-class.js";

export const isAuthenticated = TryCatch(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   console.log("Authorization header is missing or not a Bearer token");
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    //   console.log("Token is missing");
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET || "");
    req.user = await User.findById(decodedData.id, {
      email: 1,
      role: 1,
      username: 1,
      phone: 1,
      address: 1,
    });

    if (!req.user) {
      // console.log("User not found");
      return next(new ErrorHandler("User not found", 401));
    }

    next();
  } catch (error) {
    //   console.error("JWT verification error: ", error);
    return next(new ErrorHandler("Invalid token", 401));
  }
});

export const adminOnly = TryCatch(async (req, res, next) => {
  const { role } = req.user;
  if (role !== "admin") {
    return next(
      new ErrorHandler("You are unauthorized to access this resource", 401)
    );
  }
  next();
});
