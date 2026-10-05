import crypto from "node:crypto";
import { razorpay } from "../utils/paymentClient.js";
import { TryCatch } from "../middleware/error.js";
import PaymentAttempt from "../model/PaymentAttempt.js";
import { bookingError, checkSeats, prepareBooking } from "../services/bookingSafety.js";
import { finalizePayment, validSignature } from "../services/paymentSafety.js";
export const createPaymentIntent = TryCatch(async (req, res) => {
  if (!razorpay) throw bookingError("Payment gateway is not configured", 503);
  const {
    trip,
    bookingData
  } = await prepareBooking(req.body.booking || {});
  await checkSeats(trip, bookingData);
  const amount = Math.round(bookingData.advancePaid * 100);
  if (amount <= 0) throw bookingError("Invalid payment amount");
  // Save the complete booking snapshot before checkout. Webhooks can recover it
  // even if the browser closes immediately after payment.
  const attempt = new PaymentAttempt({
    orderId: `pending_${crypto.randomUUID()}`,
    amount,
    bookingData
  });
  await attempt.save();
  const paymentDetail = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: String(attempt._id)
  });
  attempt.orderId = paymentDetail.id;
  await attempt.save();
  res.status(201).json({
    success: true,
    paymentDetail,
    totalAmount: bookingData.price,
    amountToPay: bookingData.advancePaid
  });
});
export const paymentWebhook = TryCatch(async (req, res) => {
  if (!validSignature(req.body, req.headers["x-razorpay-signature"], process.env.RAZORPAY_WEBHOOK_SECRET)) throw bookingError("Invalid webhook signature", 401);
  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && (await PaymentAttempt.exists({
      orderId: payment.order_id
    }))) await finalizePayment(payment.order_id, payment.id);
  }
  res.json({
    success: true
  });
});
export const getRefundAlerts = TryCatch(async (req, res) => {
  const filter = req.query.status === "resolved" ? "resolved" : "refund_required";
  const alerts = await PaymentAttempt.find({
    status: filter
  }).sort({
    createdAt: -1
  }).lean();
  res.json({
    alerts
  });
});
export const resolveRefundAlert = TryCatch(async (req, res) => {
  const reference = String(req.body.refundReference || "").trim();
  if (!reference) throw bookingError("Enter the completed refund reference");
  const alert = await PaymentAttempt.findOneAndUpdate({
    _id: req.params.id,
    status: "refund_required"
  }, {
    $set: {
      status: "resolved",
      refundReference: reference,
      adminNote: String(req.body.adminNote || "").trim(),
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    }
  }, {
    new: true
  });
  if (!alert) throw bookingError("Open refund alert not found", 404);
  res.json({
    success: true,
    alert
  });
});
export const reconcilePayments = TryCatch(async (_req, res) => {
  if (!razorpay) throw bookingError("Payment gateway is not configured", 503);
  const pending = await PaymentAttempt.find({
    status: "pending",
    orderId: {
      $regex: "^order_"
    }
  }).sort({
    createdAt: 1
  }).limit(100);
  let processed = 0;
  let failed = 0;
  for (const attempt of pending) {
    try {
      const payments = await razorpay.orders.fetchPayments(attempt.orderId);
      const captured = payments.items.find(p => p.status === "captured");
      if (captured) {
        await finalizePayment(attempt.orderId, captured.id);
        processed++;
      }
    } catch {
      failed++;
    }
  }
  res.json({
    success: true,
    processed,
    failed,
    checked: pending.length
  });
});
