import { compare } from "bcrypt";
import { TryCatch } from "../middleware/error.js";
import User from "../model/userModel.js";
import { sendMail } from "../utils/sendOTP.js";
import {
  createEmailHTML,
  generateOTP,
  resetPasswordHTML,
} from "../utils/userUtils.js";
import ErrorHandler from "../utils/utilit-class.js";
import sendToken from "../utils/sendToken.js";

export const register = TryCatch(async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return next(new ErrorHandler("Please fill in all fields", 400));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("User already exists", 400));
  }
  // Generate OTP and its expiry time
  const otp = generateOTP();
  const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  //create user and save
  const newUser = await User.create({
    username: username,
    email,
    password,
    otp,
    otp_expiry,
  });
  await newUser.save();

  const html = createEmailHTML(username, otp);
  await sendMail({
    email,
    subject: "Email Verification OTP",
    html,
  });
  return res.status(201).json({
    message: `Verification email sent to ${newUser.email}`,
    success: true,
  });
});

export const resetOTP = TryCatch(async (req, res, next) => {
  const { otp, email } = req.body;
  console.log({ otp, email });

  // Check for missing fields
  if (!otp || !email) {
    return next(
      new ErrorHandler("OTP and email are required to proceed.", 400)
    );
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    return next(
      new ErrorHandler(
        "No account associated with this email address was found.",
        404
      )
    );
  }
  // Validate OTP
  if (user.resetPasswordOTP !== otp) {
    return next(
      new ErrorHandler(
        "The OTP you entered is incorrect. Please try again.",
        401
      )
    );
  }

  // Check OTP expiry
  if (user.resetPasswordOTPExpiry < new Date()) {
    return next(
      new ErrorHandler("The OTP has expired. Please request a new one.", 401)
    );
  }

  // Update user verification status and clear OTP fields
  user.emailVerified = true;
  // user.resetPasswordOTP = null;
  // user.resetPasswordOTPExpiry = null;
  await user.save();

  // Respond with success message
  res.status(200).json({
    success: true,
    message:
      "Your OTP has been successfully verified. You can now proceed with resetting your password.",
  });
});

export const resetPassword = TryCatch(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler("Email is required", 400));
  }
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return next(new ErrorHandler("User with this email does not exist", 404));
  }

  const otp = generateOTP();
  const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // Update user with OTP and expiry time
  existingUser.resetPasswordOTP = otp;
  existingUser.resetPasswordOTPExpiry = otp_expiry;

  await existingUser.save();

  // Create email HTML
  const html = resetPasswordHTML(existingUser.name, otp);

  // Send OTP email
  await sendMail({
    email: existingUser.email,
    subject: "Password Reset OTP",
    html,
  });

  // Respond with success message
  return res.status(200).json({
    message: `Password reset OTP sent to ${existingUser.email}`,
    success: true,
  });
});

// Log in a user by checking credentials and storing the token in a cookie
export const login = TryCatch(async (req, res, next) => {
  const { email, password } = req.body;
  console.log({ email, password });
  // Check if all required fields are present
  if (!email || !password) {
    return next(new ErrorHandler("Please fill in all the details", 400));
  }

  // Find user by email and include password for comparison
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 404));
  }

  // Compare provided password with stored hashed password
  const isMatch = await compare(password, user.password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 404));
  }
  // console.log(user);
  sendToken(user, 200, res, `Welcome back, ${user.username || "User"}`);
  // sendToken(res, user, 200, `Welcome back, ${user.name}`);
});

// Get the currently logged-in user's profile
export const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

export const verifyEmailOTP = TryCatch(async (req, res, next) => {
  const { otp, email } = req.body;
  console.log({ otp, email });

  if (!otp || !email) {
    return next(new ErrorHandler("OTP and email are required", 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (user.otp !== Number(otp)) {
    return next(new ErrorHandler("Invalid OTP", 401));
  }

  if (user.otp_expiry < new Date()) {
    return next(new ErrorHandler("OTP has expired", 401));
  }

  user.emailVerified = true;
  user.otp = null;
  user.otp_expiry = null;
  await user.save();
  sendToken(res, user, 201, `Welcome , ${user.name}`);
});

export const updateRole = TryCatch(async (req, res, next) => {
  const { role } = req.body;
  const userId = req.user; // Ensure req.user contains the user ID

  if (!role) {
    return next(new ErrorHandler("Role not provided", 400)); // Change message and status code
  }

  if (!userId) {
    return next(new ErrorHandler("User ID not found", 401)); // Handle case where userId is missing
  }

  // Update the user role
  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true } // new: true returns the updated document, runValidators ensures validation is applied
  );

  if (!user) {
    return next(new ErrorHandler("User not found", 404)); // Handle case where user is not found
  }

  return res.status(200).json({
    message: "Role updated successfully",
    success: true,
    user,
  });
});

export const resetpassword = async (req, res) => {
  try {
    const { otp, password } = req.body;

    const user = await User.findOne({
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: Date.now() },
    }).select("+password");
    if (!otp || !password) {
      return res
        .status(400)
        .json({ success: false, message: "please enter all fields" });
    }
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "OTP Invaild or has been Expired" });
    }

    user.password = password;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Password Changed Successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
