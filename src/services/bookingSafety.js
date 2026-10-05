import mongoose from "mongoose";
import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";
import { addDaysToDateStr, getInterconnection, hasInterconnectedSeatConflict } from "../utils/interconnection.js";
import { sendMail } from "../utils/sendOTP.js";
import { generateBookingConfirmationHTML } from "../utils/userUtils.js";
const scopeSchema = new mongoose.Schema({
  _id: String,
  revision: {
    type: Number,
    default: 0
  }
});
const SeatScope = mongoose.model("SeatScope", scopeSchema);
export function bookingError(message, statusCode = 400) {
  return Object.assign(new Error(message), {
    statusCode
  });
}

// Linked day and stay packages acquire overlapping locks. A transaction writes
// these documents before reading bookings, so MongoDB retries concurrent writers
// with a fresh snapshot. Locks need no expiration and confirmed seats stay in Booking.
export function seatScopes(trip, date) {
  const ic = getInterconnection(trip);
  const scopes = [`${trip._id}:${date}`];
  if (ic.enabled && ic.role === "stay") {
    if (ic.outboundTrip) scopes.push(`${ic.outboundTrip}:${date}`);
    if (ic.returnTrip) scopes.push(`${ic.returnTrip}:${addDaysToDateStr(date, ic.dayOffset)}`);
  } else if (ic.enabled && ic.stayTrip) {
    scopes.push(`${ic.stayTrip}:${ic.role === "return" ? addDaysToDateStr(date, -ic.dayOffset) : date}`);
  }
  return [...new Set(scopes)].sort();
}
export async function withSeatTransaction(trip, date, work, additionalScopes = []) {
  const scopes = [...new Set([...seatScopes(trip, date), ...additionalScopes])].sort();
  // Create lock rows outside the transaction. Concurrent first-use upserts can
  // race on _id; the losing insert can safely use the existing row.
  for (const _id of scopes) {
    try {
      await SeatScope.updateOne({
        _id
      }, {
        $setOnInsert: {
          revision: 0
        }
      }, {
        upsert: true
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      for (const _id of scopes) await SeatScope.updateOne({
        _id
      }, {
        $inc: {
          revision: 1
        }
      }, {
        session
      });
      return work(session);
    });
  } finally {
    await session.endSession();
  }
}
export async function prepareBooking(data, admin = false) {
  if (!mongoose.isValidObjectId(data.tripId)) throw bookingError("Invalid trip ID");
  const trip = await Trip.findById(data.tripId);
  if (!trip) throw bookingError("Trip not found", 404);
  if (!/^\d{2}-\d{2}-\d{4}$/.test(data.selectedDate || "")) throw bookingError("Selected date must be DD-MM-YYYY");
  const start = trip.startDates.find(s => s.date === data.selectedDate);
  if (!start && !admin) throw bookingError("Selected date is not available for this trip");
  if (!Array.isArray(data.passengers) || !data.passengers.length) throw bookingError("Passenger details are required");
  if (!Array.isArray(data.selectedSeats) || !data.selectedSeats.length) throw bookingError("Please select seats");
  const selectedSeats = data.selectedSeats.map(s => {
    if (!s || typeof s.seat !== "string" || !s.seat.trim() || !Number.isInteger(s.busIndex) || s.busIndex < 0 || s.leg && !["single", "going", "coming"].includes(s.leg)) {
      throw bookingError("Invalid seat selection");
    }
    return {
      seat: s.seat.trim(),
      busIndex: s.busIndex,
      leg: s.leg || "single"
    };
  });
  const physical = selectedSeats.filter(s => !["N/A", "block"].includes(s.seat));
  const keys = physical.map(s => `${s.leg}:${s.busIndex}:${s.seat}`);
  if (new Set(keys).size !== keys.length) throw bookingError("The same seat cannot be selected twice");
  const ic = getInterconnection(trip);
  if (ic.enabled && ic.role === "stay") {
    const going = selectedSeats.filter(s => s.leg === "going").length;
    const coming = selectedSeats.filter(s => s.leg === "coming").length;
    if (!going || going !== coming || going !== data.passengers.length) throw bookingError("Select Going and Coming seats for every passenger");
  } else if (selectedSeats.some(s => s.leg !== "single")) throw bookingError("Invalid seat leg for this trip");
  if (!admin && physical.length && !(ic.enabled && ic.role === "stay") && physical.length !== data.passengers.length) throw bookingError("Seats must match the number of passengers");
  if (!admin && (start?.seats === 20 || start?.seats === 32 || ic.role === "stay") && physical.length !== selectedSeats.length) throw bookingError("Please select seats from the seat map");
  if (!admin && physical.length && data.passengers.length < (start?.minSeatsPerBooking || 1)) throw bookingError("Please select the minimum number of seats for this trip");
  for (const s of physical) {
    let seatDate = start;
    if (ic.enabled && ic.role === "stay") {
      const linkedId = s.leg === "coming" ? ic.returnTrip : ic.outboundTrip;
      const linked = linkedId ? await Trip.findById(linkedId) : trip;
      const linkedDate = s.leg === "coming" ? addDaysToDateStr(data.selectedDate, ic.dayOffset) : data.selectedDate;
      seatDate = linked?.startDates.find(d => d.date === linkedDate);
    }
    const buses = Number(seatDate?.numberOfBusesAvailable) || seatDate?.vehicles?.length || 1;
    if (!seatDate || s.busIndex >= buses || !/^\d+$/.test(s.seat) || Number(s.seat) < 1 || Number(s.seat) > ([20, 32].includes(Number(seatDate.seats)) ? Number(seatDate.seats) - 1 : Number(seatDate.seats))) throw bookingError("Seat or bus is not available on this date");
  }
  if (!admin && trip.dropPoints?.length && data.passengers.some(p => !trip.dropPoints.some(d => d.location === p.dropLocation))) throw bookingError("Please select a listed drop location for every passenger");
  const pkg = data.selectedPackage ? trip.packages.id(data.selectedPackage) : null;
  const room = data.selectedRoomChoice ? trip.roomChoices.id(data.selectedRoomChoice) : null;
  if (data.selectedPackage && !pkg) throw bookingError("Invalid package");
  if (pkg && pkg.personCount !== data.passengers.length) throw bookingError("Passenger count must match the package");
  if (data.selectedRoomChoice && !room) throw bookingError("Invalid room choice");
  const roomCount = Number(data.roomCount || 0);
  if (!Number.isInteger(roomCount) || roomCount < 0 || room && roomCount < Math.ceil(data.passengers.length / 2) || !room && roomCount) throw bookingError("Invalid room count");
  let price = Number(data.price);
  let advancePaid = Number(data.advancePaid || 0);
  if (!admin) {
    let base = pkg ? pkg.price : (parseInt(trip.price) || 1000) * data.passengers.length;
    if (trip.discountPercentage > 0 && trip.discountPercentage <= 100) base *= 1 - trip.discountPercentage / 100;
    price = Math.round((base + (room ? room.price * roomCount : 0)) * 1.05 * 100) / 100;
    advancePaid = data.paymentOption === "advance" ? Math.round(price * (trip.advancePaymentPercentage || 50)) / 100 : price;
  }
  if (!Number.isFinite(price) || !Number.isFinite(advancePaid) || price < 0 || advancePaid < 0 || advancePaid > price) throw bookingError("Invalid payment amount");
  if (admin && !String(data.blockReason || "").trim()) throw bookingError("Please add a reason for blocking seats");
  const bookingData = {
    trip: trip._id,
    tripTitle: trip.title || trip.location || "Trip",
    selectedDate: data.selectedDate,
    selectedSeats,
    passengers: data.passengers,
    selectedPackage: pkg?._id || null,
    selectedRoomChoice: room?._id || null,
    roomCount,
    price,
    advancePaid,
    remainingBalance: Math.round((price - advancePaid) * 100) / 100,
    paymentStatus: advancePaid >= price ? "full" : advancePaid > 0 ? "advance" : "pending",
    status: "confirmed",
    isAdminBooking: admin,
    blockReason: admin ? String(data.blockReason).trim() : ""
  };
  await new Booking(bookingData).validate();
  return {
    trip,
    bookingData
  };
}
export async function checkSeats(trip, data, session = null, exclude = null) {
  const conflict = await hasInterconnectedSeatConflict(trip, data.selectedDate, data.selectedSeats, session, exclude);
  if (conflict.conflict) throw bookingError(`${conflict.message}. Please go back and select different seats.`, 409);
}
export async function notifyBooking(booking, trip) {
  if (booking.isAdminBooking) return;
  const vehicles = trip.startDates?.find(s => s.date === booking.selectedDate)?.vehicles || [];
  const recipients = [...new Set(booking.passengers.map(p => p.email)), "sunshineholidaypackages@gmail.com"];
  const results = await Promise.allSettled(recipients.map(email => sendMail({
    email,
    subject: "Booking Confirmation",
    html: generateBookingConfirmationHTML(booking, booking.passengers.find(p => p.email === email) || booking.passengers[0], trip, vehicles)
  })));
  if (results.some(r => r.status === "rejected")) console.error("Booking confirmed; one or more confirmation emails could not be sent", booking._id);
}
