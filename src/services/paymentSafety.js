import crypto from "node:crypto";
import PaymentAttempt from "../model/PaymentAttempt.js";
import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";
import { razorpay } from "../utils/paymentClient.js";
import { bookingError, checkSeats, notifyBooking, withSeatTransaction } from "./bookingSafety.js";
export function validSignature(value, signature, secret) {
  if (!secret || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(value).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

// Both the browser callback and captured-payment webhook use this idempotent
// finalizer. A paid conflict is recorded rather than losing the customer's data.
export async function finalizePayment(orderId, paymentId, {
  gateway = razorpay,
  notify = notifyBooking
} = {}) {
  if (!gateway) throw bookingError("Payment gateway is not configured", 503);
  const attempt = await PaymentAttempt.findOne({
    orderId
  });
  if (!attempt) throw bookingError("Payment order not found", 404);
  const payment = await gateway.payments.fetch(paymentId);
  if (payment.order_id !== orderId || payment.currency !== "INR" || payment.amount !== attempt.amount) throw bookingError("Payment does not match this booking", 400);
  if (payment.status !== "captured") throw bookingError("Payment is awaiting capture. Your booking will be confirmed once the payment is captured.", 425);
  const trip = await Trip.findById(attempt.bookingData.trip);
  // A deleted trip still needs a refund record, using its original lock scope.
  const scopeTrip = trip || {
    _id: attempt.bookingData.trip
  };
  const result = await withSeatTransaction(scopeTrip, attempt.bookingData.selectedDate, async session => {
    const current = await PaymentAttempt.findOneAndUpdate({
      orderId
    }, {
      $inc: {
        revision: 1
      }
    }, {
      new: true,
      session
    });
    if (current.status !== "pending") {
      if (current.paymentId !== paymentId) throw bookingError("This order has already been processed with another payment", 409);
      return {
        status: current.status,
        booking: current.booking ? await Booking.findById(current.booking).session(session) : null,
        alertId: current._id,
        created: false
      };
    }
    current.paymentId = paymentId;
    let conflict = trip ? "" : "Trip was removed after payment started";
    if (trip) {
      try {
        await checkSeats(trip, current.bookingData, session);
      } catch (error) {
        if (error.statusCode !== 409) throw error;
        conflict = error.message;
      }
    }
    if (conflict) {
      current.status = "refund_required";
      current.reason = conflict;
      await current.save({
        session
      });
      return {
        status: current.status,
        alertId: current._id,
        created: false
      };
    }
    const booking = new Booking({
      ...current.bookingData,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId
    });
    await booking.save({
      session
    });
    current.status = "confirmed";
    current.booking = booking._id;
    await current.save({
      session
    });
    return {
      status: "confirmed",
      booking,
      created: true
    };
  });
  if (result.created) await notify(result.booking, trip);
  return result;
}
