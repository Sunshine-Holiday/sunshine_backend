import { razorpay } from "../app.js";
import { TryCatch } from "../middleware/error.js";
import ErrorHandler from "../utils/utilit-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  let { amount } = req.body;
  console.log("Raw amount from body:", amount);

  if (!amount) return next(new ErrorHandler("Please enter amount", 400));

  amount = Number(amount);

  if (isNaN(amount) || amount <= 0) {
    return next(new ErrorHandler("Invalid amount", 400));
  }

  const amountInPaise = Math.round(amount * 100); // Ensure integer

  const paymentDetail = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `receipt_wallet_${Date.now()}`,
    payment_capture: 1,
  });

  console.log("Payment Detail:", paymentDetail);

  return res.status(201).json({
    success: true,
    paymentDetail,
  });
});
