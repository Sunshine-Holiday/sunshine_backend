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

export const generateBookingConfirmationHTML = (booking, passenger,trip) => {
  const formattedDate = new Date(booking.createdAt).toLocaleDateString("en-IN");

  const seatList = booking.selectedSeats
    .map((s) => `Seat ${s.seat} (Bus ${s.busIndex + 1})`)
    .join(", ");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      padding: 10px;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 6px;
    }
    .header {
      background: #4CAF50;
      color: #ffffff;
      padding: 15px;
      text-align: center;
      border-radius: 6px 6px 0 0;
    }
    .box {
      border: 1px solid #ddd;
      padding: 15px;
      margin-top: 15px;
      border-radius: 4px;
    }
    .footer {
      font-size: 12px;
      color: #666;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Booking Confirmation</h2>
    </div>

    <p>Hello <strong>${passenger.name}</strong>,</p>
    <p>Your booking has been successfully confirmed. 🎉</p>

    <div class="box">
      <p><strong>Booking ID:</strong> ${booking._id
        .toString()
        .slice(-6)
        .toUpperCase()}</p>
<p><strong>Trip Name:</strong> ${trip.title || "-"}</p>
<p><strong>Location:</strong> ${trip.location || "N/A"}</p>

      <p><strong>Trip Date:</strong> ${booking.selectedDate}</p>
      <p><strong>Booking Date:</strong> ${formattedDate}</p>
      <p><strong>Seats:</strong> ${seatList}</p>
    </div>

    <div class="box">
      <p><strong>Total Price:</strong> ₹${booking.price}</p>
      <p><strong>Advance Paid:</strong> ₹${booking.advancePaid}</p>
      <p><strong>Remaining Balance:</strong> ₹${booking.remainingBalance}</p>
      <p><strong>Payment Status:</strong> ${booking.paymentStatus.toUpperCase()}</p>
    </div>

    <div class="box">
      <h4>Passenger Details</h4>
      <p><strong>Phone:</strong> ${passenger.phoneNumber}</p>
      <p><strong>Email:</strong> ${passenger.email}</p>
      <p><strong>ID Proof:</strong> ${passenger.idProof} - ${passenger.idProofNumber}</p>
    </div>

    <p>Please arrive at least <strong>30 minutes early</strong> with a valid ID proof.</p>

    <div class="footer">
      <p>
        Sunshine Holiday Packages<br />
        📧 sunshineholidaypackages@gmail.com
      </p>
    </div>
  </div>
</body>
</html>
`;
};




export const generateRefundRequestHTML = (booking, user, reason) => {
  // Format the request date
  const formattedRequestDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          background-color: #2196F3;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
        }
        .refund-details {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
        .original-booking {
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
          <h1>Refund Request Confirmation</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.username || "Traveler"},</h2>
          <p>We have received your refund request. Our team will review it and get back to you soon. Here are the details:</p>
          
          <div class="refund-details">
            <h3>Refund Request Details</h3>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Request Date:</strong> ${booking?.selectedDate}</p>
            // <p><strong>Reason for Refund:</strong> ${reason}</p>
            <p><strong>Current Status:</strong> Processing</p>
            <p><strong>Original Amount:</strong> Rs ${booking.price}</p>
          </div>

          <div class="original-booking">
            <h3>Original Booking Summary</h3>
            <p><strong>Trip Date:</strong> ${new Date(booking.selectedDate).toLocaleDateString("en-US")}</p>
            <p><strong>Selected Seats:</strong> ${booking.selectedSeats.join(", ")}</p>
          </div>

          <p>Please allow 5-7 business days for us to process your refund request. You'll receive another email once it's been reviewed.</p>
          <p>If you have any urgent queries, please quote your Booking ID: ${booking._id}</p>
        </div>
        <div class="footer">
          <p>Thank you for your patience!</p>
          <p>If you have any questions, contact us at sunshineholidaypackages@gmail.com</p>
          <p>© ${new Date().getFullYear()} <strong>Sunshine Holiday Packages</strong>. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateRefundProcessedHTML = (booking, user) => {
  // Format the processed date
  const formattedProcessedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format the original trip date
  const formattedTripDate = new Date(booking.selectedDate).toLocaleDateString("en-US");

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
        .refund-details {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }
        .original-booking {
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
          <h1>Refund Processed Successfully</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.username || "Traveler"},</h2>
          <p>Good news! Your refund has been successfully processed. Here are the details:</p>
          
          <div class="refund-details">
            <h3>Refund Details</h3>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Processed Date:</strong> ${formattedProcessedDate}</p>
            <p><strong>Refunded Amount:</strong> Rs ${booking.price}</p>
            <p><strong>Status:</strong> Resolved</p>
          </div>

          <div class="original-booking">
            <h3>Original Booking Summary</h3>
            <p><strong>Trip Date:</strong> ${formattedTripDate}</p>
            <p><strong>Selected Seats:</strong> ${booking.selectedSeats.join(", ")}</p>
          </div>

          <p>The refunded amount should reflect in your original payment method within 3-5 business days, depending on your bank/card provider.</p>
          <p>If you don't see the refund within this timeframe, please contact us with your Booking ID: ${booking._id}</p>
        </div>
        <div class="footer">
          <p>We hope to serve you again in the future!</p>
          <p>If you have any questions, contact us at sunshineholidaypackages@gmail.com</p>
          <p>© ${new Date().getFullYear()} <strong>Sunshine Holiday Packages</strong>. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateReviewFeedbackHTML = (booking, user) => {
return `<!DOCTYPE html>
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
    .cta-button {
      display: inline-block;
      padding: 10px 25px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
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
      <h1>We'd Love to Hear About Your Trip!</h1>
    </div>
    <div class="content">
      <h2>Hello ${user.username || 'Traveler'},</h2>
      <p>We hope you had an amazing experience with Sunshine Holiday Packages! Your feedback means the world to us and helps us make future trips even better.</p>
      
      <div class="booking-details">
        <h3>Your Trip Details</h3>
        <p><strong>Booking ID:</strong> ${booking._id}</p>
        <p><strong>Trip Date:</strong> ${new Date(booking.selectedDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <p>Please share your experience with us. How was your trip? What did you smile about? Any suggestions for us to improve?</p>
      <p><a href="https://www.sunshineholidaypackages.com/review/${booking._id}" class="cta-button">Write Your Review Now</a></p>
      
      <p>Your review will be submitted for approval and may be featured on our website to inspire other travelers!</p>
    </div>
    <div class="footer">
      <p>Thank you for choosing Sunshine Holiday Packages!</p>
      <p>If you have any questions, contact us at sunshineholidaypackages@gmail.com</p>
      <p>© ${new Date().getFullYear()} <strong>Sunshine Holiday Packages</strong>. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
};