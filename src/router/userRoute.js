import { Router } from "express";
import { checkForgetPasswordOTP, login, register, resetPassword } from "../controller/userController.js";

const userRouter=Router();

userRouter.post("/register",register)
userRouter.post("/login",login)
userRouter.post("/forgotpassword",resetPassword)
userRouter.put("/otp-check",checkForgetPasswordOTP)
export default userRouter;