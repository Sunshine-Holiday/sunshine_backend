import crypto from "crypto";

export const generateOTP = () => crypto.randomInt(100000, 999999);

export const createEmailHTML = (username, otp) => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }
    .container {
      padding: 20px;
    }
    .footer {
      margin-top: 20px;
      font-size: 0.9em;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <p>Dear ${username},</p>
    <p>Thank you for registering. Here is your OTP to verify your email address: <strong>${otp}</strong>.</p>
    <p>If you have any questions, please reply to this email.</p>
    <p><strong>- The Freelance-Fussion Team</strong></p>
  </div>
  <div class="footer">
    <p>This email is intended only for the recipient. If you received this email by mistake, please delete it immediately.</p>
  </div>
</body>
</html>`;

export const ForgetHtml = (username, otp) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }
      .container {
        padding: 20px;
      }
      .footer {
        margin-top: 20px;
        font-size: 0.9em;
        color: #555;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <p>Dear ${username},</p>
      <p>We have received your request to reset your password. Here is your OTP to create your new password: <strong>${otp}</strong>.</p>
      <p>If you have any questions, please reply to this email.</p>
      <p><strong>Note:</strong> For your security and privacy, please change your password after your first login.</p>
      <p><strong>Sunshine Holiday Packages</strong></p>
    </div>
    <div class="footer">
      <p>This email is intended only for the recipient. If you received this email by mistake, please delete it immediately.</p>
    </div>
  </body>
</html>`;

export const resetPasswordHTML = (username, otp) => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }
    .container {
      padding: 20px;
    }
    .footer {
      margin-top: 20px;
      font-size: 0.9em;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <p>Dear ${username},</p>
     <p>Your OTP for resetting your password is: <strong>${otp}</strong></p>
    <p>If you have any questions, please reply to this email.</p>
    <p><strong>Sunshine Holiday Packages</strong></p>
  </div>
  <div class="footer">
    <p>This email is intended only for the recipient. If you received this email by mistake, please delete it immediately.</p>
  </div>
</body>
</html>`;
