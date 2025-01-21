import { compare } from "bcrypt";
import { TryCatch } from "../middleware/error.js";
import User from "../model/userModel.js";
import { sendMail } from "../utils/sendOTP.js";
import {
  contactHTML,
  createEmailHTML,
  generateOTP,
  resetPasswordHTML,
} from "../utils/userUtils.js";
import ErrorHandler from "../utils/utilit-class.js";
import sendToken from "../utils/sendToken.js";

export const register = TryCatch(async (req, res, next) => {
  const { username, email, password, phone } = req.body;

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
    phone: phone,
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

export const forgetPassword = TryCatch(async (req, res, next) => {
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
  // console.log(user);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
    message: "User profile retrieved successfully",
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
  sendToken(user, 200, res, "Email verified successfully");
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

export const checkForgetPasswordOTP = TryCatch(async (req, res, next) => {
  const { otp, email } = req.body;
  if (!email) {
    return next(new ErrorHandler("Please enter your email", 400));
  }

  if (!otp) {
    return next(new ErrorHandler("please enter otp", 400));
  }

  const user = await User.findOne({ email });

  // If the user is not found
  if (!user) {
    return next(new ErrorHandler("email not found ", 400));
  }
  console.log(user.resetPasswordOTP, otp);
  if (
    user.resetPasswordOTP !== otp ||
    user.resetPasswordOTPExpiry < Date.now()
  ) {
    return next(new ErrorHandler("OTP Invaild or has been Expired ", 400));
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: `Otp is  correct`,
  });
});

export const resetPassword = TryCatch(async (req, res) => {
  const { email, otp, password } = req.body;

  // Validate inputs
  if (!email || !otp || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields.",
    });
  }

  // Find user by email
  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpiry: { $gt: Date.now() }, // Ensure OTP is valid
  }).select("+password"); // Include password field for modification

  // Validate user and OTP
  if (!user) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email or OTP has expired." });
  }

  // Update password and clear OTP fields
  user.password = password;
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpiry = null;

  // Save user with the updated password
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

export const updateProfile = TryCatch(async (req, res, next) => {
  const { username, email, phone, address } = req.body;
  console.log({ username, email, phone, address });
  const id = req.user._id;
  const user = await User.findByIdAndUpdate(
    id,
    { username, email, phone, address },
    { new: true, runValidators: true }
  );
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

export const contact = TryCatch(async (req, res, next) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return next(new ErrorHandler("Please fill in all fields", 400));
  }
  const html = contactHTML({ name, email, message });
  await sendMail({
    email: process.env.SMTP_USER,
    subject: `Contact request from ${name}`,
    html,
    from: email,
  });
  return res.status(200).json({
    success: true,
    message: "Message sent successfully",
  });
});

// admin -- All User Detail
export const getAllUserDetails = TryCatch(async (req, res, next) => {
  const user = await User.find({}).sort({ createdAt: -1 });

  return res.status(200).json({
    message: "All user  found successfull",
    success: true,
    user,
  });
});

// admin -- single user Details
export const getSingleUserDetail = TryCatch(
  async (req, res, next) => {
    const { id } = req.params;
    // console.log(req.query)
    if (!id) {
      return next(
        new ErrorHandler("Id is required to access user Details", 400)
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return next(
        new ErrorHandler("Id is invalid to access user Details", 400)
      );
    }
    return res.status(200).json({
      message: " user  found successfull",
      success: true,
      user,
    });
  }
);

export const updateSingleUserDetails = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new ErrorHandler("Id is required to access user details", 400));
  }

  // Fetch the user's current details
  const user = await User.findById(id);

  if (!user) {
    return next(new ErrorHandler("User not found with the provided id", 404));
  }

  // Toggle role between "admin" and "user"
  const updatedRole = user.role === "admin" ? "user" : "admin";

  // Update the user's role
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { role: updatedRole },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    return next(new ErrorHandler("Failed to update user role", 400));
  }

  return res.status(200).json({
    message: `User role updated successfully to ${updatedRole}`,
    success: true,
    user: updatedUser,
  });
});

export const deleteUser = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  if (!id) {
    return next(new ErrorHandler("Id is required to delete user", 400));
  }

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) {
    return next(new ErrorHandler("Id is invalid to delete user", 400));
  }

  return res.status(200).json({
    message: "User deleted successfully",
    success: true,
  });
});
