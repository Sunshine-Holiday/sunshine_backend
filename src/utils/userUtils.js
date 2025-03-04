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

export const contactHTML = ({ name, email, message }) => `
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
  <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong>     <span>${message}</span></p>

    </div>
    <div class="footer">
      <p>This email is intended only for the recipient. If you received this email by mistake, please delete it immediately.</p>
  </body>
</html>`;

export const generateBookingConfirmationHTML = (booking, user) => {
  // Format the date nicely
  const formattedDate = new Date(booking.selectedDate).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #4CAF50;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .booking-details {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
        .passenger {
          margin: 10px 0;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 4px;
        }
        .footer {
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 12px;
          background-color: #f4f4f4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmation</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.username || "Traveler"},</h2>
          <p>Your booking has been successfully confirmed! Here are the details:</p>
          
          <div class="booking-details">
            <h3>Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Trip Date:</strong> ${formattedDate}</p>
            <p><strong>Selected Seats:</strong> ${booking.selectedSeats.join(
              ", "
            )}</p>
            <p><strong>Total Price:</strong> Rs ${booking.price}</p>
          </div>

          <h3>Passenger Details</h3>
          ${booking.passengers
            .map(
              (passenger) => `
            <div class="passenger">
              <p><strong>Name:</strong> ${passenger.name}</p>
              <p><strong>Age:</strong> ${passenger.age}</p>
              <p><strong>Gender:</strong> ${passenger.gender}</p>
              <p><strong>ID Proof:</strong> ${passenger.idProof}: ${passenger.idProofNumber}</p>
            </div>
          `
            )
            .join("")}

          <p>Please arrive at least 30 minutes before departure time with your ID proof.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing us!</p>
          <p>If you have any questions, contact us at sunshineholidaypackages@gmail.com</p>
          <p>&copy; ${new Date().getFullYear()}<strong>Sunshine Holiday Packages</strong>All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
