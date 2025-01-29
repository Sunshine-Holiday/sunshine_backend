import { Router } from "express";
import {
  checkForgetPasswordOTP,
  contact,
  deleteUser,
  forgetPassword,
  getAllUserDetails,
  getMyProfile,
  getSingleUserDetail,
  login,
  register,
  resetPassword,
  updateProfile,
  updateProfilePic,
  updateSingleUserDetails,
  verifyEmailOTP,
} from "../controller/userController.js";
import { adminOnly, isAuthenticated } from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const userRouter = Router();
// send email  for contact
userRouter.post("/contact", contact);
userRouter.put("/profile-pic",isAuthenticated,upload,updateProfilePic)

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


  // admin ----

  userRouter.route("/allUser").get(isAuthenticated, adminOnly, getAllUserDetails);
  userRouter
    .route("/allUser/:id")
    .get(isAuthenticated, adminOnly, getSingleUserDetail)
    .put(isAuthenticated, adminOnly, updateSingleUserDetails)
    .delete(isAuthenticated, adminOnly, deleteUser);

export default userRouter;
