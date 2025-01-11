import { Router } from "express";
import { checkForgetPasswordOTP, forgetPassword, login, register, resetPassword } from "../controller/userController.js";

const userRouter=Router();
// created signin  route
userRouter.post("/login",login)
// step by step for register
userRouter.post("/register",register)


// step by step for forget password 
userRouter.post("/forgotpassword",forgetPassword)
userRouter.put("/otp-check",checkForgetPasswordOTP)
userRouter.put("/reset-password",resetPassword)

export default userRouter;