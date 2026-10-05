import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../src/model/userModel.js";
import bookingRouter from "../src/router/booking.js";
import messagingRouter from "../src/router/messaging.js";
import paymentRouter from "../src/router/payment.js";
import { paymentWebhook, resolveRefundAlert } from "../src/controller/payment.js";
import { updateBookingSeats } from "../src/controller/booking.js";
import mongoose from "mongoose";
import Trip from "../src/model/Trip.js";
import Booking from "../src/model/booking.js";
import PaymentAttempt from "../src/model/PaymentAttempt.js";
import MessageBatch from "../src/model/MessageBatch.js";
import MessageTemplate from "../src/model/MessageTemplate.js";
import { prepareBooking, checkSeats, withSeatTransaction } from "../src/services/bookingSafety.js";
import { finalizePayment, validSignature } from "../src/services/paymentSafety.js";
import { normalizePhones, sendProviderMessage } from "../src/services/messaging.js";
import { duplicateTrip } from "../src/controller/tripController.js";
import { sendMessages, createTemplate, editTemplate } from "../src/controller/messaging.js";
const date = "19-09-2026";
const returnDate = "20-09-2026";
const passenger = {
  name: "Test passenger",
  email: "test@example.com",
  phoneNumber: "9876543210",
  age: 25,
  gender: "male",
  idProof: "aadhar",
  idProofNumber: "123456789012",
  dropLocation: "Pune"
};
const seat = (number = "3", busIndex = 0, leg = "single") => ({
  seat: number,
  busIndex,
  leg
});
let serial = 0;
let notifications = 0;
const payments = new Map();
const options = {
  gateway: {
    payments: {
      fetch: async id => payments.get(id)
    }
  },
  notify: async () => {
    notifications++;
  }
};
const tripData = {
  title: "Test trip",
  price: "1000",
  dropPoints: [{
    location: "Pune"
  }],
  startDates: [{
    date,
    seats: 32,
    numberOfBusesAvailable: "2"
  }, {
    date: returnDate,
    seats: 32,
    numberOfBusesAvailable: "2"
  }]
};
async function attempt(trip, seats = [seat()], selectedDate = date) {
  const index = ++serial;
  const orderId = `order_test_${index}`;
  const paymentId = `pay_test_${index}`;
  const {
    bookingData
  } = await prepareBooking({
    tripId: String(trip._id),
    selectedDate,
    selectedSeats: seats,
    passengers: [passenger],
    paymentOption: "full"
  });
  await PaymentAttempt.create({
    orderId,
    bookingData,
    amount: 105000
  });
  payments.set(paymentId, {
    order_id: orderId,
    amount: 105000,
    currency: "INR",
    status: "captured"
  });
  return {
    orderId,
    paymentId
  };
}
async function finish(a) {
  return finalizePayment(a.orderId, a.paymentId, options);
}
async function controller(fn, req) {
  let code = 200;
  let body;
  const res = {
    status(value) {
      code = value;
      return this;
    },
    json(value) {
      body = value;
      return this;
    }
  };
  await fn(req, res, error => {
    throw error;
  });
  return {
    code,
    body
  };
}
before(async () => {
  // Deliberately fixed to an isolated local replica set, never .env's MONGO_URI.
  const client = new mongoose.mongo.MongoClient("mongodb://127.0.0.1:27019/?directConnection=true", {
    serverSelectionTimeoutMS: 3000
  });
  await client.connect();
  try {
    await client.db("admin").command({
      replSetInitiate: {
        _id: "sunshineTest",
        members: [{
          _id: 0,
          host: "127.0.0.1:27019"
        }]
      }
    });
  } catch (error) {
    if (error.codeName !== "AlreadyInitialized") throw error;
  }
  await client.close();
  await mongoose.connect("mongodb://127.0.0.1:27019/sunshine_safety_test?replicaSet=sunshineTest", {
    serverSelectionTimeoutMS: 15000
  });
  await mongoose.connection.dropDatabase();
  await Promise.all([Booking.init(), PaymentAttempt.init(), Trip.init(), MessageBatch.init(), MessageTemplate.init()]);
});
after(async () => {
  if (mongoose.connection.readyState) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
test("simultaneous captured payments confirm one customer and retain the other as a refund alert", async () => {
  const trip = await Trip.create(tripData);
  const a = await attempt(trip);
  const b = await attempt(trip);
  const initial = notifications;
  const results = await Promise.all([finish(a), finish(b)]);
  assert.deepEqual(results.map(r => r.status).sort(), ["confirmed", "refund_required"]);
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 1);
  const alert = await PaymentAttempt.findOne({
    status: "refund_required",
    "bookingData.trip": trip._id
  });
  assert.equal(alert.bookingData.passengers[0].email, passenger.email);
  assert.equal(alert.amount, 105000);
  assert.ok(alert.paymentId);
  assert.equal(notifications - initial, 1);
  const again = await Promise.all([finish(a), finish(b)]);
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 1);
  assert.equal(notifications - initial, 1);
  assert.equal(again.filter(r => r.status === "refund_required").length, 1);
  await assert.rejects(checkSeats(trip, {
    selectedDate: date,
    selectedSeats: [seat()]
  }), {
    statusCode: 409
  });
});
test("different buses and dates can use the same seat number", async () => {
  const trip = await Trip.create(tripData);
  const attempts = await Promise.all([attempt(trip, [seat("4", 0)]), attempt(trip, [seat("4", 1)]), attempt(trip, [seat("4", 0)], returnDate)]);
  const results = await Promise.all(attempts.map(finish));
  assert.ok(results.every(r => r.status === "confirmed"));
});
test("linked stay and outbound trips cannot confirm the same physical seat", async () => {
  const outbound = await Trip.create(tripData);
  const returning = await Trip.create(tripData);
  const stay = await Trip.create({
    ...tripData,
    interconnection: {
      enabled: true,
      role: "stay",
      outboundTrip: outbound._id,
      returnTrip: returning._id,
      dayOffset: 1
    }
  });
  outbound.interconnection = {
    enabled: true,
    role: "outbound",
    stayTrip: stay._id
  };
  await outbound.save();
  returning.interconnection = {
    enabled: true,
    role: "return",
    stayTrip: stay._id
  };
  await returning.save();
  const a = await attempt(outbound, [seat("5")]);
  const b = await attempt(stay, [seat("5", 0, "going"), seat("6", 0, "coming")]);
  const results = await Promise.all([finish(a), finish(b)]);
  assert.deepEqual(results.map(r => r.status).sort(), ["confirmed", "refund_required"]);
  // The losing stay booking must never partially occupy its return seats.
  if (results[1].status === "refund_required") await checkSeats(returning, {
    selectedDate: returnDate,
    selectedSeats: [seat("6")]
  });
});
test("linked return trip uses the stay package's offset date", async () => {
  const outbound = await Trip.create(tripData);
  const returning = await Trip.create(tripData);
  const stay = await Trip.create({
    ...tripData,
    interconnection: {
      enabled: true,
      role: "stay",
      outboundTrip: outbound._id,
      returnTrip: returning._id
    }
  });
  returning.interconnection = {
    enabled: true,
    role: "return",
    stayTrip: stay._id
  };
  await returning.save();
  const a = await attempt(returning, [seat("7")], returnDate);
  const b = await attempt(stay, [seat("8", 0, "going"), seat("7", 0, "coming")]);
  const results = await Promise.all([finish(a), finish(b)]);
  assert.deepEqual(results.map(r => r.status).sort(), ["confirmed", "refund_required"]);
});
test("callback and webhook racing on one payment create one booking and one notification", async () => {
  const trip = await Trip.create(tripData);
  const a = await attempt(trip, [seat("9")]);
  const initial = notifications;
  const results = await Promise.all([finish(a), finish(a), finish(a)]);
  assert.ok(results.every(r => r.status === "confirmed"));
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 1);
  assert.equal(notifications - initial, 1);
});
test("invalid payment amount, currency, order and uncaptured payments cannot confirm seats", async () => {
  const trip = await Trip.create(tripData);
  const a = await attempt(trip);
  const original = payments.get(a.paymentId);
  for (const invalid of [{
    amount: 1
  }, {
    currency: "USD"
  }, {
    order_id: "different"
  }, {
    status: "authorized"
  }]) {
    payments.set(a.paymentId, {
      ...original,
      ...invalid
    });
    await assert.rejects(finish(a));
  }
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 0);
  assert.equal((await PaymentAttempt.findOne({
    orderId: a.orderId
  })).status, "pending");
});
test("deleted trips after checkout preserve captured payment as a refund alert", async () => {
  const trip = await Trip.create(tripData);
  const a = await attempt(trip);
  await Trip.deleteOne({
    _id: trip._id
  });
  assert.equal((await finish(a)).status, "refund_required");
});
test("server pricing, advances, drop choices and seat range are validated before checkout", async () => {
  const trip = await Trip.create({
    ...tripData,
    discountPercentage: 10,
    advancePaymentPercentage: 25
  });
  const data = {
    tripId: String(trip._id),
    selectedDate: date,
    selectedSeats: [seat()],
    passengers: [passenger],
    price: 1,
    advancePaid: 1,
    paymentOption: "advance"
  };
  const prepared = await prepareBooking(data);
  assert.equal(prepared.bookingData.price, 945);
  assert.equal(prepared.bookingData.advancePaid, 236.25);
  for (const invalid of [{
    selectedDate: "99-99-2026"
  }, {
    selectedSeats: [seat("32")]
  }, {
    selectedSeats: [seat("3", 2)]
  }, {
    passengers: [{
      ...passenger,
      dropLocation: "Invalid"
    }]
  }, {
    selectedSeats: [seat(), seat()]
  }]) await assert.rejects(prepareBooking({
    ...data,
    ...invalid
  }));
});
test("admin blocking and captured payments share the same concurrency protection", async () => {
  const trip = await Trip.create(tripData);
  const a = await attempt(trip);
  const block = prepareBooking({
    tripId: String(trip._id),
    selectedDate: date,
    selectedSeats: [seat()],
    passengers: [passenger],
    price: 1050,
    blockReason: "Reserved for group"
  }, true).then(({
    bookingData
  }) => withSeatTransaction(trip, date, async session => {
    await checkSeats(trip, bookingData, session);
    const booking = new Booking(bookingData);
    await booking.save({
      session
    });
    return booking;
  }));
  const results = await Promise.allSettled([block, finish(a)]);
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 1);
  assert.equal(results[1].status, "fulfilled");
});
test("trip duplication copies content and drop locations with new IDs and no bookings", async () => {
  const trip = await Trip.create({
    ...tripData,
    packages: [{
      title: "Couple",
      personCount: 2,
      price: 2000
    }],
    interconnection: {
      enabled: true,
      role: "outbound",
      stayTrip: new mongoose.Types.ObjectId()
    }
  });
  const result = await controller(duplicateTrip, {
    params: {
      id: String(trip._id)
    }
  });
  assert.equal(result.code, 201);
  const copy = result.body.trip;
  assert.equal(copy.title, "Test trip (Copy)");
  assert.equal(copy.dropPoints[0].location, "Pune");
  assert.notEqual(String(copy.startDates[0]._id), String(trip.startDates[0]._id));
  assert.notEqual(String(copy.packages[0]._id), String(trip.packages[0]._id));
  assert.equal(copy.interconnection.enabled, false);
  assert.equal(await Booking.countDocuments({
    trip: copy._id
  }), 0);
});
test("payment signatures reject missing, malformed and forged values", () => {
  const value = "order_test|pay_test";
  const secret = "test_secret";
  const signature = crypto.createHmac("sha256", secret).update(value).digest("hex");
  assert.ok(validSignature(value, signature, secret));
  assert.equal(validSignature(value + "forged", signature, secret), false);
  assert.equal(validSignature(value, "bad", secret), false);
  assert.equal(validSignature(value, signature, ""), false);
});
test("recipient parsing normalizes Indian numbers, deduplicates and rejects invalid input", () => {
  assert.deepEqual(normalizePhones("9876543210, +91 9876543210;\n+14155552671\n"), ["+919876543210", "+14155552671"]);
  assert.throws(() => normalizePhones("wrong"));
  assert.throws(() => normalizePhones(""));
});
test("SMS and WhatsApp encode the provider payload and report partial failures without resending", async () => {
  const original = globalThis.fetch;
  process.env.TWILIO_ACCOUNT_SID = "ACtest";
  process.env.TWILIO_AUTH_TOKEN = "test";
  process.env.TWILIO_SMS_FROM = "+14155552671";
  process.env.TWILIO_WHATSAPP_FROM = "+14155552671";
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    const body = options.body;
    if (body.get("To") === "+919876543211") return {
      ok: false,
      json: async () => ({
        message: "Invalid destination"
      })
    };
    return {
      ok: true,
      json: async () => ({
        sid: "SMtest",
        status: "queued"
      })
    };
  };
  try {
    const req = {
      user: {
        _id: new mongoose.Types.ObjectId()
      },
      body: {
        requestId: crypto.randomUUID(),
        channel: "sms",
        phones: "9876543210,9876543211",
        message: "Test only"
      }
    };
    const first = await controller(sendMessages, req);
    assert.deepEqual(first.body.batch.results.map(r => r.status), ["queued", "failed"]);
    await controller(sendMessages, req);
    assert.equal(calls, 2);
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.body.get("To"), "whatsapp:+919876543210");
      assert.equal(options.body.get("From"), "whatsapp:+14155552671");
      assert.equal(options.body.get("Body"), null);
      assert.equal(options.body.get("ContentSid"), "HX" + "a".repeat(32));
      return {
        ok: true,
        json: async () => ({
          sid: "SMtest",
          status: "queued"
        })
      };
    };
    assert.equal((await sendProviderMessage("whatsapp", "+919876543210", "ignored", "HX" + "a".repeat(32))).status, "queued");
  } finally {
    globalThis.fetch = original;
  }
});
test("saved templates can be edited and reused", async () => {
  const user = {
    _id: new mongoose.Types.ObjectId()
  };
  const created = await controller(createTemplate, {
    user,
    body: {
      name: "Trip update",
      message: "Original message"
    }
  });
  const edited = await controller(editTemplate, {
    user,
    params: {
      id: created.body.template._id
    },
    body: {
      name: "Trip update",
      message: "Updated message"
    }
  });
  assert.equal(edited.body.template.message, "Updated message");
  assert.equal(await MessageTemplate.countDocuments(), 1);
});
test("admin seat changes preserve bus and leg and reject occupied or duplicated seats", async () => {
  const trip = await Trip.create(tripData);
  const a = await finish(await attempt(trip, [seat("12", 1)]));
  await finish(await attempt(trip, [seat("13", 1)]));
  const req = {
    params: {
      bookingId: String(a.booking._id)
    },
    body: {
      oldSeat: "12",
      newSeat: "13",
      busIndex: 1
    }
  };
  assert.equal((await controller(updateBookingSeats, req)).code, 409);
  req.body.newSeat = "14";
  assert.equal((await controller(updateBookingSeats, req)).code, 200);
  const updated = await Booking.findById(a.booking._id);
  assert.equal(updated.selectedSeats[0].seat, "14");
  assert.equal(updated.selectedSeats[0].busIndex, 1);
  assert.equal(updated.razorpayPaymentId, a.booking.razorpayPaymentId);
});
test("refund resolution retains the payment and booking snapshot and records its audit reference", async () => {
  const trip = await Trip.create(tripData);
  await finish(await attempt(trip));
  const result = await finish(await attempt(trip));
  const user = {
    _id: new mongoose.Types.ObjectId()
  };
  await assert.rejects(controller(resolveRefundAlert, {
    user,
    params: {
      id: result.alertId
    },
    body: {}
  }));
  const resolved = await controller(resolveRefundAlert, {
    user,
    params: {
      id: result.alertId
    },
    body: {
      refundReference: "rfnd_test",
      adminNote: "Completed in gateway"
    }
  });
  assert.equal(resolved.body.alert.status, "resolved");
  assert.equal(resolved.body.alert.refundReference, "rfnd_test");
  assert.equal(resolved.body.alert.bookingData.passengers[0].email, passenger.email);
  assert.equal(String(resolved.body.alert.resolvedBy), String(user._id));
  assert.ok(resolved.body.alert.resolvedAt);
  assert.equal(await Booking.countDocuments({
    trip: trip._id
  }), 1);
});
test("HTTP routes protect messaging, refunds and admin blocks, and verify raw webhook signatures", async () => {
  process.env.JWT_SECRET = "local_test_jwt_secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "local_test_webhook_secret";
  const admin = await User.create({
    email: "admin@example.com",
    role: "admin",
    password: "test-password"
  });
  const user = await User.create({
    email: "user@example.com",
    role: "user",
    password: "test-password"
  });
  const token = person => jwt.sign({
    id: String(person._id)
  }, process.env.JWT_SECRET);
  const app = express();
  app.post("/api/v1/payment/webhook", express.raw({
    type: "application/json"
  }), paymentWebhook);
  app.use(express.json());
  app.use("/api/v1/messaging", messagingRouter);
  app.use("/api/v1/payment", paymentRouter);
  app.use("/api/v1/booking", bookingRouter);
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({
    message: error.message
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ["/api/v1/messaging", "/api/v1/payment/refund-alerts"]) {
      assert.equal((await fetch(base + path)).status, 401);
      assert.equal((await fetch(base + path, {
        headers: {
          Authorization: `Bearer ${token(user)}`
        }
      })).status, 401);
      assert.equal((await fetch(base + path, {
        headers: {
          Authorization: `Bearer ${token(admin)}`
        }
      })).status, 200);
    }
    const post = (path, body, headers = {}) => fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    });
    assert.equal((await post("/api/v1/booking", {
      isadminBooking: true
    })).status, 401);
    assert.equal((await post("/api/v1/booking", {})).status, 400);
    const event = {
      event: "payment.failed"
    };
    assert.equal((await post("/api/v1/payment/webhook", event)).status, 401);
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(JSON.stringify(event)).digest("hex");
    assert.equal((await post("/api/v1/payment/webhook", event, {
      "x-razorpay-signature": signature
    })).status, 200);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
