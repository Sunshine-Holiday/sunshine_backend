import { Router } from "express";
import {
  checkForgetPasswordOTP,
  forgetPassword,
  getMyProfile,
  login,
  register,
  resetPassword,
  updateProfile,
  verifyEmailOTP,
} from "../controller/userController.js";
import { isAuthenticated } from "../middleware/auth.js";

const userRouter = Router();
// created signin  route
userRouter.post("/login", login);
// step by step for register
userRouter.post("/register", register);
userRouter.put("/verify-email", verifyEmailOTP);

// step by step for forget password
userRouter.post("/forgotpassword", forgetPassword);
userRouter.put("/otp-check", checkForgetPasswordOTP);
userRouter.put("/reset-password", resetPassword);

//authenticated  user route

userRouter
  .get("/profile", isAuthenticated, getMyProfile)
  .put("/profile", isAuthenticated, updateProfile);

export default userRouter;
