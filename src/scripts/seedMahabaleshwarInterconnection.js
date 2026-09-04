/**
 * Seed demo: Mahabaleshwar interconnected trips (Sat / Sun / 2D1N)
 *
 * Run from sunshine_backend:
 *   node src/scripts/seedMahabaleshwarInterconnection.js
 *
 * Creates or updates 3 trips, links them, and plants sample bookings so
 * you can open booking pages and see seats blocked across trips in realtime.
 */

import "dotenv/config";
import mongoose from "mongoose";
import Trip from "../model/Trip.js";
import Booking from "../model/booking.js";
import { connectDB } from "../utils/db.js";

const PLACEHOLDER_BANNER =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

function nextWeekday(weekday /* 0=Sun..6=Sat */, from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const diff = (weekday - d.getDay() + 7) % 7;
  // if today is that weekday, use next week so demos always have future dates
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}

function fmt(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function makeStartDates(baseDates, seats = 20) {
  return baseDates.map((date) => ({
    date: fmt(date),
    seats,
    numberOfBusesAvailable: "1",
    minSeatsPerBooking: 1,
    vehicles: [
      {
        instructorName: "Demo Driver",
        vehicleNumber: "MH-12-DEMO",
        phoneNumber: "9999999999",
      },
    ],
  }));
}

const boardingPoints = [
  {
    location: "Pune - Swargate",
    time: "06:00 AM",
    details: "Near bus stand gate 2",
    maplink: "https://maps.google.com/?q=Swargate+Pune",
  },
  {
    location: "Pune - Shivajinagar",
    time: "06:20 AM",
    details: "Opposite COEP",
    maplink: "https://maps.google.com/?q=Shivajinagar+Pune",
  },
];

const dropPoints = [
  {
    location: "Mahabaleshwar - Main Market",
    details: "Near ST bus stand",
    maplink: "https://maps.google.com/?q=Mahabaleshwar+Main+Market",
  },
  {
    location: "Mahabaleshwar - Venna Lake",
    details: "Boating club parking",
    maplink: "https://maps.google.com/?q=Venna+Lake+Mahabaleshwar",
  },
];

async function upsertTrip(filter, data) {
  let trip = await Trip.findOne(filter);
  if (trip) {
    Object.assign(trip, data);
    await trip.save();
    console.log(`  ✓ Updated: ${trip.title} (${trip._id})`);
  } else {
    trip = await Trip.create(data);
    console.log(`  ✓ Created: ${trip.title} (${trip._id})`);
  }
  return trip;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }

  await connectDB(uri);

  console.log("\n🌱 Seeding Mahabaleshwar interconnection demo…\n");

  // Next 4 Saturdays and Sundays
  let sat = nextWeekday(6);
  const saturdays = [sat];
  for (let i = 0; i < 3; i++) {
    sat = addDays(sat, 7);
    saturdays.push(new Date(sat));
  }
  const sundays = saturdays.map((d) => addDays(d, 1));

  const common = {
    location: "Pune",
    state: "Mahabaleshwar",
    banner: PLACEHOLDER_BANNER,
    banners: [PLACEHOLDER_BANNER],
    amenities: ["AC", "Music and Fun", "Charging Points"],
    boardingPoints,
    dropPoints,
    advancePaymentPercentage: 30,
    discountPercentage: 0,
    highlights: [
      "Scenic viewpoints",
      "Shared coach for day + stay packages",
      "Demo interconnected seats",
    ],
    includes: ["Travel", "Guide"],
    cancellationPolicy: "Demo trip — cancellation as per policy.",
    displayIndex: 1,
  };

  // 1) Saturday day tour (outbound)
  const satTrip = await upsertTrip(
    { title: "Mahabaleshwar (Every Saturday) [DEMO IC]" },
    {
      ...common,
      title: "Mahabaleshwar (Every Saturday) [DEMO IC]",
      category: "Interconnected Tours",
      description:
        "<p><strong>Demo interconnected trip</strong> — One day Saturday tour. Seats shared with 2D1N Going leg.</p>",
      price: "1499",
      startDates: makeStartDates(saturdays, 20),
      interconnection: {
        enabled: true,
        role: "outbound",
        outboundTrip: null,
        returnTrip: null,
        stayTrip: null,
        dayOffset: 1,
      },
    }
  );

  // 2) Sunday day tour (return)
  const sunTrip = await upsertTrip(
    { title: "Mahabaleshwar (Every Sunday) [DEMO IC]" },
    {
      ...common,
      title: "Mahabaleshwar (Every Sunday) [DEMO IC]",
      category: "Interconnected Tours",
      description:
        "<p><strong>Demo interconnected trip</strong> — One day Sunday tour. Seats shared with 2D1N Coming leg.</p>",
      price: "1499",
      startDates: makeStartDates(sundays, 20),
      interconnection: {
        enabled: true,
        role: "return",
        outboundTrip: null,
        returnTrip: null,
        stayTrip: null,
        dayOffset: 1,
      },
    }
  );

  // 3) 2D1N stay (links both)
  const stayTrip = await upsertTrip(
    { title: "Mahabaleshwar (2 Days 1 Night) [DEMO IC]" },
    {
      ...common,
      title: "Mahabaleshwar (2 Days 1 Night) [DEMO IC]",
      category: "Interconnected Tours",
      description:
        "<p><strong>Demo stay package</strong> — Goes with Saturday bus, returns with Sunday bus. Book Going + Coming seats.</p>",
      price: "3999",
      startDates: makeStartDates(saturdays, 20), // start = Saturday
      packages: [
        {
          title: "Solo Person",
          description: "2D1N stay demo package",
          personCount: 1,
          price: 3999,
        },
        {
          title: "Couple",
          description: "2D1N for 2",
          personCount: 2,
          price: 7499,
        },
      ],
      interconnection: {
        enabled: true,
        role: "stay",
        outboundTrip: satTrip._id,
        returnTrip: sunTrip._id,
        stayTrip: null,
        dayOffset: 1,
      },
    }
  );

  // Link day trips back to stay
  satTrip.interconnection = {
    enabled: true,
    role: "outbound",
    outboundTrip: null,
    returnTrip: null,
    stayTrip: stayTrip._id,
    dayOffset: 1,
  };
  await satTrip.save();

  sunTrip.interconnection = {
    enabled: true,
    role: "return",
    outboundTrip: null,
    returnTrip: null,
    stayTrip: stayTrip._id,
    dayOffset: 1,
  };
  await sunTrip.save();

  console.log("\n🔗 Links:");
  console.log(`  Stay  → Going: ${satTrip._id}`);
  console.log(`  Stay  → Coming: ${sunTrip._id}`);
  console.log(`  Sat   → Stay:  ${stayTrip._id}`);
  console.log(`  Sun   → Stay:  ${stayTrip._id}`);

  // Clear previous demo bookings on first demo date
  const demoSat = fmt(saturdays[0]);
  const demoSun = fmt(sundays[0]);

  await Booking.deleteMany({
    trip: { $in: [satTrip._id, sunTrip._id, stayTrip._id] },
    "passengers.email": /demo-ic@sunshine\.local/i,
  });

  const dummyPassenger = (name, seatNote) => ({
    name,
    age: 30,
    gender: "male",
    idProof: "aadhar",
    idProofNumber: "000000000000",
    phoneNumber: "9876543210",
    email: "demo-ic@sunshine.local",
    address: "Pune - Swargate",
  });

  // Sample: book seat 1 on Saturday (should also block Stay Going seat 1)
  await Booking.create({
    trip: satTrip._id,
    price: 1499,
    advancePaid: 1499,
    remainingBalance: 0,
    paymentStatus: "full",
    selectedDate: demoSat,
    selectedSeats: [{ seat: "1", busIndex: 0, leg: "single" }],
    passengers: [dummyPassenger("Demo Sat Passenger", "seat1")],
    status: "confirmed",
    isAdminBooking: false,
  });

  // Sample: book seat 2 on Sunday (should also block Stay Coming seat 2)
  await Booking.create({
    trip: sunTrip._id,
    price: 1499,
    advancePaid: 1499,
    remainingBalance: 0,
    paymentStatus: "full",
    selectedDate: demoSun,
    selectedSeats: [{ seat: "2", busIndex: 0, leg: "single" }],
    passengers: [dummyPassenger("Demo Sun Passenger", "seat2")],
    status: "confirmed",
    isAdminBooking: false,
  });

  // Sample: stay books going seat 3 + coming seat 3 (blocks Sat 3 and Sun 3)
  await Booking.create({
    trip: stayTrip._id,
    price: 3999,
    advancePaid: 1200,
    remainingBalance: 2799,
    paymentStatus: "advance",
    selectedDate: demoSat,
    selectedSeats: [
      { seat: "3", busIndex: 0, leg: "going" },
      { seat: "3", busIndex: 0, leg: "coming" },
    ],
    passengers: [dummyPassenger("Demo Stay Passenger", "seat3")],
    status: "confirmed",
    isAdminBooking: false,
  });

  console.log("\n🪑 Sample bookings planted:");
  console.log(`  Sat  ${demoSat}: seat 1 booked → also blocked on Stay Going`);
  console.log(`  Sun  ${demoSun}: seat 2 booked → also blocked on Stay Coming`);
  console.log(
    `  Stay ${demoSat}: going seat 3 + coming seat 3 → blocks Sat & Sun seat 3`
  );

  const base =
    process.env.FRONTEND_URL ||
    process.env.FRONTEND_URL2 ||
    "http://localhost:5173";

  console.log("\n✅ Open these in the browser to see realtime blocking:\n");
  console.log(`  Saturday day tour:\n    ${base}/trips/${satTrip._id}`);
  console.log(`  Sunday day tour:\n    ${base}/trips/${sunTrip._id}`);
  console.log(`  2D1N stay (dual maps):\n    ${base}/trips/${stayTrip._id}`);
  console.log(`\n  Booking (after Book Now) uses seat maps for date ${demoSat} / ${demoSun}`);
  console.log("\n  Admin edit interconnection:");
  console.log(`    ${base}/admin/trips  → open a DEMO IC trip → scroll to Trip Interconnection\n`);

  await mongoose.disconnect();
  console.log("Done.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
