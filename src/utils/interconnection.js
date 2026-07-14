/**
 * Interconnected trip helpers (e.g. Mahabaleshwar Sat / Sun / 2D1N).
 *
 * Roles:
 *  - outbound: day trip going (Sat) — seats shared with stay "going"
 *  - return:   day trip return (Sun) — seats shared with stay "coming"
 *  - stay:     multi-day — needs going + coming seats on linked day trips
 */

import Booking from "../model/booking.js";
import Trip from "../model/Trip.js";

/** Parse DD-MM-YYYY → Date (local midnight) */
export function parseDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = String(dateStr).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format Date → DD-MM-YYYY */
export function formatDDMMYYYY(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Add days to DD-MM-YYYY string */
export function addDaysToDateStr(dateStr, days) {
  const d = parseDDMMYYYY(dateStr);
  if (!d) return "";
  d.setDate(d.getDate() + Number(days || 0));
  return formatDDMMYYYY(d);
}

export function getInterconnection(trip) {
  const ic = trip?.interconnection || {};
  const role = ic.role || "none";
  const enabled = Boolean(ic.enabled) && role !== "none";
  return {
    enabled,
    role: enabled ? role : "none",
    outboundTrip: ic.outboundTrip || null,
    returnTrip: ic.returnTrip || null,
    stayTrip: ic.stayTrip || null,
    dayOffset: Math.max(1, Number(ic.dayOffset) || 1),
  };
}

/**
 * Merge seat objects into selectedSeatsByBus map { busIndex: string[] }
 */
export function mergeSeatsIntoMap(map, seatList) {
  if (!Array.isArray(seatList)) return map;
  for (const s of seatList) {
    if (!s || s.seat === "N/A" || s.seat === "block") continue;
    const busIndex = Number(s.busIndex ?? 0);
    const seat = String(s.seat);
    if (!map[busIndex]) map[busIndex] = [];
    if (!map[busIndex].includes(seat)) map[busIndex].push(seat);
  }
  return map;
}

/**
 * Fetch booked seats for a trip on a date, optionally filtered by leg.
 * legs: array of allowed legs, e.g. ['single','going'] or null for all
 */
export async function getBookedSeatsForTripDate(tripId, selectedDate, legs = null) {
  if (!tripId || !selectedDate) return [];

  const filter = {
    trip: tripId,
    selectedDate: String(selectedDate).trim(),
    status: { $ne: "refund" },
  };

  const bookings = await Booking.find(filter).select("selectedSeats").lean();
  const seats = [];

  for (const b of bookings) {
    for (const s of b.selectedSeats || []) {
      if (!s || s.seat === "N/A" || s.seat === "block") continue;
      const leg = s.leg || "single";
      if (legs && !legs.includes(leg)) continue;
      seats.push({
        seat: String(s.seat),
        busIndex: Number(s.busIndex ?? 0),
        leg,
      });
    }
  }
  return seats;
}

/**
 * Build the full set of occupied seats for a trip seat-map view.
 *
 * @param {object} trip - current trip doc
 * @param {string} selectedDate - DD-MM-YYYY for this trip's booking date
 * @param {'single'|'going'|'coming'} mapLeg - which map is being shown
 *   - day trips use 'single' (shows single + linked stay leg)
 *   - stay going map uses 'going'
 *   - stay coming map uses 'coming'
 */
export async function getInterconnectedOccupiedSeats(
  trip,
  selectedDate,
  mapLeg = "single"
) {
  const ic = getInterconnection(trip);
  const map = {};

  if (!ic.enabled) {
    // Normal trip: all seats on this trip/date
    const seats = await getBookedSeatsForTripDate(trip._id, selectedDate, null);
    return mergeSeatsIntoMap(map, seats);
  }

  if (ic.role === "outbound") {
    // Sat day-trip map = own seats + stay "going" seats starting this date
    const own = await getBookedSeatsForTripDate(trip._id, selectedDate, [
      "single",
      "going",
    ]);
    mergeSeatsIntoMap(map, own);

    if (ic.stayTrip) {
      const stayGoing = await getBookedSeatsForTripDate(
        ic.stayTrip,
        selectedDate,
        ["going"]
      );
      mergeSeatsIntoMap(map, stayGoing);
    }
    return map;
  }

  if (ic.role === "return") {
    // Sun day-trip map = own seats + stay "coming" where stay start + offset = this date
    const own = await getBookedSeatsForTripDate(trip._id, selectedDate, [
      "single",
      "coming",
    ]);
    mergeSeatsIntoMap(map, own);

    if (ic.stayTrip) {
      const stayStart = addDaysToDateStr(selectedDate, -ic.dayOffset);
      if (stayStart) {
        const stayComing = await getBookedSeatsForTripDate(
          ic.stayTrip,
          stayStart,
          ["coming"]
        );
        mergeSeatsIntoMap(map, stayComing);
      }
    }
    return map;
  }

  if (ic.role === "stay") {
    // Stay package: going map uses outbound trip + stay going; coming uses return + stay coming
    if (mapLeg === "going" || mapLeg === "single") {
      // Own stay going seats for start date
      const stayGoing = await getBookedSeatsForTripDate(
        trip._id,
        selectedDate,
        ["going"]
      );
      mergeSeatsIntoMap(map, stayGoing);

      if (ic.outboundTrip) {
        const outbound = await getBookedSeatsForTripDate(
          ic.outboundTrip,
          selectedDate,
          ["single", "going"]
        );
        mergeSeatsIntoMap(map, outbound);
      }
    }

    if (mapLeg === "coming") {
      const stayComing = await getBookedSeatsForTripDate(
        trip._id,
        selectedDate,
        ["coming"]
      );
      mergeSeatsIntoMap(map, stayComing);

      const returnDate = addDaysToDateStr(selectedDate, ic.dayOffset);
      if (ic.returnTrip && returnDate) {
        const ret = await getBookedSeatsForTripDate(
          ic.returnTrip,
          returnDate,
          ["single", "coming"]
        );
        mergeSeatsIntoMap(map, ret);
      }
    }

    return map;
  }

  // Fallback
  const seats = await getBookedSeatsForTripDate(trip._id, selectedDate, null);
  return mergeSeatsIntoMap(map, seats);
}

/**
 * Check if proposed seats conflict with interconnected occupancy.
 * selectedSeats: [{ seat, busIndex, leg? }]
 */
export async function hasInterconnectedSeatConflict(
  trip,
  selectedDate,
  selectedSeats
) {
  const ic = getInterconnection(trip);
  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return { conflict: false };
  }

  // Group by leg for stay bookings
  const byLeg = { single: [], going: [], coming: [] };
  for (const s of selectedSeats) {
    const leg = s.leg || "single";
    if (!byLeg[leg]) byLeg[leg] = [];
    byLeg[leg].push(s);
  }

  const conflicts = [];

  const checkAgainstMap = (occupiedMap, seats, label) => {
    for (const s of seats) {
      const bus = Number(s.busIndex ?? 0);
      const seat = String(s.seat);
      if (occupiedMap[bus]?.includes(seat)) {
        conflicts.push(`${label}: Bus ${bus + 1} seat ${seat}`);
      }
    }
  };

  if (!ic.enabled) {
    const map = await getInterconnectedOccupiedSeats(
      trip,
      selectedDate,
      "single"
    );
    checkAgainstMap(map, selectedSeats, "This trip");
    return {
      conflict: conflicts.length > 0,
      message: conflicts.length
        ? `Seat(s) already booked: ${conflicts.join(", ")}`
        : "",
    };
  }

  if (ic.role === "outbound") {
    const map = await getInterconnectedOccupiedSeats(
      trip,
      selectedDate,
      "single"
    );
    checkAgainstMap(map, selectedSeats, "Outbound / Stay going");
  } else if (ic.role === "return") {
    const map = await getInterconnectedOccupiedSeats(
      trip,
      selectedDate,
      "single"
    );
    checkAgainstMap(map, selectedSeats, "Return / Stay coming");
  } else if (ic.role === "stay") {
    const goingSeats =
      byLeg.going.length > 0 ? byLeg.going : byLeg.single;
    const comingSeats = byLeg.coming;

    if (goingSeats.length) {
      const goingMap = await getInterconnectedOccupiedSeats(
        trip,
        selectedDate,
        "going"
      );
      checkAgainstMap(goingMap, goingSeats, "Going");
    }
    if (comingSeats.length) {
      const comingMap = await getInterconnectedOccupiedSeats(
        trip,
        selectedDate,
        "coming"
      );
      checkAgainstMap(comingMap, comingSeats, "Coming");
    }
  }

  return {
    conflict: conflicts.length > 0,
    message: conflicts.length
      ? `Seat(s) already booked on linked trips: ${conflicts.join(", ")}`
      : "",
  };
}

/**
 * Populate interconnection trip refs on a trip document (plain object ok).
 */
export async function populateInterconnection(trip) {
  if (!trip) return trip;
  const ic = trip.interconnection;
  if (!ic || !ic.enabled) return trip;

  const ids = [ic.outboundTrip, ic.returnTrip, ic.stayTrip].filter(Boolean);
  if (!ids.length) return trip;

  const linked = await Trip.find({ _id: { $in: ids } })
    .select(
      "title location category state startDates interconnection banner price"
    )
    .lean();

  const byId = Object.fromEntries(linked.map((t) => [String(t._id), t]));

  const out = typeof trip.toObject === "function" ? trip.toObject() : { ...trip };
  out.interconnection = {
    ...ic,
    outboundTripPopulated: ic.outboundTrip
      ? byId[String(ic.outboundTrip)] || null
      : null,
    returnTripPopulated: ic.returnTrip
      ? byId[String(ic.returnTrip)] || null
      : null,
    stayTripPopulated: ic.stayTrip ? byId[String(ic.stayTrip)] || null : null,
  };
  return out;
}

/**
 * Parse interconnection payload from create/update form body.
 */
export function parseInterconnectionBody(body) {
  let raw = body?.interconnection;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (!raw || typeof raw !== "object") {
    return {
      enabled: false,
      role: "none",
      outboundTrip: null,
      returnTrip: null,
      stayTrip: null,
      dayOffset: 1,
    };
  }

  const role = ["outbound", "return", "stay"].includes(raw.role)
    ? raw.role
    : "none";
  const enabled = Boolean(raw.enabled) && role !== "none";

  const toId = (v) => {
    if (!v || v === "null" || v === "undefined" || v === "") return null;
    return String(v);
  };

  return {
    enabled,
    role: enabled ? role : "none",
    outboundTrip: enabled ? toId(raw.outboundTrip) : null,
    returnTrip: enabled ? toId(raw.returnTrip) : null,
    stayTrip: enabled ? toId(raw.stayTrip) : null,
    dayOffset: Math.max(1, Number(raw.dayOffset) || 1),
  };
}
