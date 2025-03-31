import { razorpay } from "../app.js";
import { TryCatch } from "../middleware/error.js";
import ErrorHandler from "../utils/utilit-class.js";


export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { amount } = req.body;
console.log(amount)
  if (!amount) return next(new ErrorHandler("Please enter amount", 400));

  const paymentDetail = await razorpay.orders.create({
    amount: amount * 100, // Amount in paise (e.g., 1000 INR = 100000 paise) world
    currency: "INR",
    receipt: `receipt_wallet_${Date.now()}`,
    payment_capture: 1,
  });

console.log(paymentDetail)
  return res.status(201).json({
    success: true,
    paymentDetail
  });
});

