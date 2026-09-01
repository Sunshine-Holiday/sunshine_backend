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

/**
 * Resolve the passenger's selected pickup / boarding point from the trip
 * and return a Google Maps link (stored maplink or search fallback).
 */
export const resolvePickupMapInfo = (passenger, trip) => {
  const address = String(passenger?.address || "").trim();
  const points = Array.isArray(trip?.boardingPoints) ? trip.boardingPoints : [];

  if (!address && points.length === 0) {
    return { location: "", date: "", time: "", details: "", mapUrl: "" };
  }

  let point =
    points.find((p) => String(p?.location || "").trim() === address) || null;

  // UI may show "Location - time" but store only location; also try prefix match
  if (!point && address) {
    point =
      points.find((p) => {
        const loc = String(p?.location || "").trim();
        return (
          address.startsWith(loc) ||
          address.includes(loc) ||
          loc.includes(address)
        );
      }) || null;
  }

  // Fallback: first boarding point if passenger has no address but trip has points
  if (!point && points.length === 1) {
    point = points[0];
  }

  const location = point?.location || address || "";
  const date = point?.date || "";
  const time = point?.time || "";
  const details = point?.details || "";
  let mapUrl = String(point?.maplink || "").trim();

  if (!mapUrl && location) {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
  }

  return { location, date, time, details, mapUrl };
};

/**
 * Resolve the passenger's selected drop location from the trip
 * and return a Google Maps link (no date, no time).
 */
export const resolveDropMapInfo = (passenger, trip) => {
  const dropLoc = String(passenger?.dropLocation || "").trim();
  const points = Array.isArray(trip?.dropPoints) ? trip.dropPoints : [];

  if (!dropLoc && points.length === 0) {
    return { location: "", details: "", mapUrl: "" };
  }

  let point =
    points.find((p) => String(p?.location || "").trim() === dropLoc) || null;

  if (!point && dropLoc) {
    point =
      points.find((p) => {
        const loc = String(p?.location || "").trim();
        return (
          dropLoc.startsWith(loc) ||
          dropLoc.includes(loc) ||
          loc.includes(dropLoc)
        );
      }) || null;
  }

  if (!point && points.length === 1 && !dropLoc) {
    point = points[0];
  }

  const location = point?.location || dropLoc || "";
  const details = point?.details || "";
  let mapUrl = String(point?.maplink || "").trim();

  if (!mapUrl && location) {
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
  }

  return { location, details, mapUrl };
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const generateBookingConfirmationHTML = (booking, passenger, trip, vehicles = []) => {
  const formattedDate = new Date(booking.createdAt).toLocaleDateString("en-IN");

  // ✅ Seat + Vehicle details (from Trip.startDates.vehicles using busIndex)
  const seatList = (booking.selectedSeats || [])
    .map((s) => {
      const busNo = Number(s.busIndex) + 1;
      const v = vehicles[s.busIndex]; // ✅ busIndex mapping

      const vehicleNo = v?.vehicleNumber || "N/A";
      const instructor = v?.instructorName || "N/A";
      const instructorPhone = v?.phoneNumber || "N/A";
      return `Seat ${s.seat} (Bus ${busNo}) - Vehicle: ${vehicleNo}, Instructor: ${instructor}, Phone: ${instructorPhone}`;
    })
    .join("<br/>");

  // All passengers' pickup and drop points (admin email benefits from full list)
  const passengers = Array.isArray(booking.passengers) ? booking.passengers : [passenger];
  const pickupRows = passengers
    .map((p) => {
      const pickupInfo = resolvePickupMapInfo(p, trip);
      const dropInfo = resolveDropMapInfo(p, trip);
      if (!pickupInfo.location && !dropInfo.location) return "";
      const pickupMapLinkHtml = pickupInfo.mapUrl
        ? `<a href="${escapeHtml(pickupInfo.mapUrl)}" target="_blank" rel="noopener noreferrer" style="color:#ea580c;font-weight:bold;text-decoration:underline;">Pickup Map →</a>`
        : "—";
      const dropMapLinkHtml = dropInfo.mapUrl
        ? `<a href="${escapeHtml(dropInfo.mapUrl)}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;font-weight:bold;text-decoration:underline;">Drop Map →</a>`
        : "—";
      return `
        <tr>
          <td style="padding:8px;border:1px solid #eee;vertical-align:top;">
            <strong>${escapeHtml(p?.name || "Passenger")}</strong>
          </td>
          <td style="padding:8px;border:1px solid #eee;vertical-align:top;">
            ${escapeHtml(pickupInfo.location || "—")}${pickupInfo.date ? ` <span style="color:#475569;font-weight:600;">[${escapeHtml(pickupInfo.date)}]</span>` : ""}${pickupInfo.time ? ` <span style="color:#666;">(${escapeHtml(pickupInfo.time)})</span>` : ""}
            ${pickupInfo.details ? `<br/><span style="color:#666;font-size:12px;">${escapeHtml(pickupInfo.details)}</span>` : ""}
          </td>
          <td style="padding:8px;border:1px solid #eee;vertical-align:top;">
            ${escapeHtml(dropInfo.location || "—")}
            ${dropInfo.details ? `<br/><span style="color:#666;font-size:12px;">${escapeHtml(dropInfo.details)}</span>` : ""}
          </td>
          <td style="padding:8px;border:1px solid #eee;vertical-align:top;white-space:nowrap;">
            ${pickupMapLinkHtml}<br/>${dropMapLinkHtml}
          </td>
        </tr>`;
    })
    .filter(Boolean)
    .join("");

  // Primary passenger pickup & drop (for user-facing copy)
  const primaryPickup = resolvePickupMapInfo(passenger, trip);
  const primaryDrop = resolveDropMapInfo(passenger, trip);
  const primaryPickupMapBtn = primaryPickup.mapUrl
    ? `<p style="margin:10px 0 0;">
        <a href="${escapeHtml(primaryPickup.mapUrl)}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;background:#ea580c;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">
          📍 Open Pickup on Google Maps
        </a>
      </p>`
    : "";
  const primaryDropMapBtn = primaryDrop.mapUrl
    ? `<p style="margin:10px 0 0;">
        <a href="${escapeHtml(primaryDrop.mapUrl)}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;background:#0284c7;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:13px;">
          📍 Open Drop Location on Google Maps
        </a>
      </p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background:#f4f4f4; padding:10px; }
    .container { max-width: 600px; margin:auto; background:#fff; padding:20px; border-radius:6px; }
    .header { background:#4CAF50; color:#fff; padding:15px; text-align:center; border-radius:6px 6px 0 0; }
    .box { border:1px solid #ddd; padding:15px; margin-top:15px; border-radius:4px; }
    .footer { font-size:12px; color:#666; text-align:center; margin-top:20px; }
    .pickup-box { border:1px solid #fdba74; background:#fff7ed; padding:15px; margin-top:15px; border-radius:4px; }
    .drop-box { border:1px solid #bae6fd; background:#f0f9ff; padding:15px; margin-top:15px; border-radius:4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Booking Confirmation</h2>
    </div>

    <p>Hello <strong>${escapeHtml(passenger.name)}</strong>,</p>
    <p>Your booking has been successfully confirmed. 🎉</p>

    <div class="box">
      <p><strong>Booking ID:</strong> ${booking._id.toString().slice(-6).toUpperCase()}</p>
      <p><strong>Trip Name:</strong> ${escapeHtml(trip.title || "-")}</p>
      <p><strong>Location:</strong> ${escapeHtml(trip.location || "N/A")}</p>
      <p><strong>Trip Date:</strong> ${escapeHtml(booking.selectedDate)}</p>
      <p><strong>Booking Date:</strong> ${formattedDate}</p>

      <p><strong>Seats + Bus + Vehicle Details:</strong><br/>${seatList}</p>
    </div>

    <div class="pickup-box">
      <h3 style="margin:0 0 8px;color:#c2410c;">📍 Pickup Location</h3>
      <p style="margin:0;">
        <strong>${escapeHtml(primaryPickup.location || passenger.address || "Not specified")}</strong>
        ${primaryPickup.date ? `<br/><strong>Date:</strong> ${escapeHtml(primaryPickup.date)}` : ""}
        ${primaryPickup.time ? `<br/><strong>Time:</strong> ${escapeHtml(primaryPickup.time)}` : ""}
        ${primaryPickup.details ? `<br/>${escapeHtml(primaryPickup.details)}` : ""}
      </p>
      ${primaryPickupMapBtn}
    </div>

    ${primaryDrop.location || passenger.dropLocation ? `
    <div class="drop-box">
      <h3 style="margin:0 0 8px;color:#0369a1;">🏁 Drop Location</h3>
      <p style="margin:0;">
        <strong>${escapeHtml(primaryDrop.location || passenger.dropLocation || "Not specified")}</strong>
        ${primaryDrop.details ? `<br/>${escapeHtml(primaryDrop.details)}` : ""}
      </p>
      ${primaryDropMapBtn}
    </div>` : ""}

    ${
      pickupRows
        ? `<div class="box">
            <h4 style="margin:0 0 10px;">Passenger Pickup & Drop Details</h4>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px;border:1px solid #eee;text-align:left;">Passenger</th>
                  <th style="padding:8px;border:1px solid #eee;text-align:left;">Pickup (Date & Time)</th>
                  <th style="padding:8px;border:1px solid #eee;text-align:left;">Drop Location</th>
                  <th style="padding:8px;border:1px solid #eee;text-align:left;">Map</th>
                </tr>
              </thead>
              <tbody>${pickupRows}</tbody>
            </table>
          </div>`
        : ""
    }

    <div class="box">
      <p><strong>Total Price:</strong> ₹${booking.price}</p>
      <p><strong>Advance Paid:</strong> ₹${booking.advancePaid}</p>
      <p><strong>Remaining Balance:</strong> ₹${booking.remainingBalance}</p>
      <p><strong>Payment Status:</strong> ${String(booking.paymentStatus).toUpperCase()}</p>
    </div>

    <div class="box">
      <h4>Passenger Details</h4>
      <p><strong>Phone:</strong> ${escapeHtml(passenger.phoneNumber)}</p>
      <p><strong>Email:</strong> ${escapeHtml(passenger.email)}</p>
      <p><strong>ID Proof:</strong> ${escapeHtml(passenger.idProof)} - ${escapeHtml(passenger.idProofNumber)}</p>
      <p><strong>Pickup Address:</strong> ${escapeHtml(passenger.address || primaryPickup.location || "—")}${primaryPickup.date ? ` (${escapeHtml(primaryPickup.date)})` : ""}${primaryPickup.time ? ` (${escapeHtml(primaryPickup.time)})` : ""}</p>
      <p><strong>Drop Location:</strong> ${escapeHtml(passenger.dropLocation || primaryDrop.location || "—")}</p>
    </div>

    <p>Please arrive at least <strong>30 minutes early</strong> with a valid ID proof. Use the Google Maps links above to reach your boarding and drop points.</p>

    <div class="footer">
      <p>Sunshine Holiday Packages<br/>📧 sunshineholidaypackages@gmail.com</p>
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