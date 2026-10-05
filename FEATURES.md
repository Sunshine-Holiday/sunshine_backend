# Sunshine bug report implementation

## WhatsApp and SMS

Open **Admin → WhatsApp & SMS**. Paste phone numbers separated by commas,
semicolons or newlines, type a message, and send through either channel. Indian
10-digit mobile numbers become +91 numbers; duplicate numbers are removed. Each
batch supports up to 100 recipients. Save named templates, select one to compose
another message, or edit/delete existing templates. The recent history shows each
recipient's provider status and any failures.

Configure these backend `.env` values, then restart the backend:

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=
```

Use a Twilio SMS sender and an enabled WhatsApp sender. Custom WhatsApp messages
require an active customer conversation. Outside that window, supply an approved
Twilio Content SID (HX...) on the saved template; this version supports approved
templates without variables. When a Content SID is selected, Twilio sends that
approved content, rather than the custom text box. Provider queued/sent statuses
are not delivery confirmations. Pending/unknown results must be checked with
Twilio before manual retries. Repeated unchanged submissions are deduplicated;
**Start new send** intentionally creates another batch.

Provider reference: [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource).

## Seat checking and refund alerts

This implements **Option 2** from the report with an additional pre-payment check.
It does not place a temporary hold as soon as a customer selects a seat.

Before opening Razorpay, the backend validates the trip/date, seat and bus,
passengers, room/package choices, drop locations and seat availability. Pricing
and the advance are calculated on the server. It stores a complete booking
snapshot against the Razorpay order.

After payment, the backend checks the checkout signature and fetches the payment
from Razorpay. Only matching captured INR payments can confirm bookings. MongoDB
transactions serialize competing bookings on shared trip/date inventory, including
linked outbound/stay/return buses. A paid seat conflict records the payment ID,
amount and all booking details under **Admin → Refund Alerts**. The losing payment
never creates a confirmed booking or a booking-confirmation email. Callback and
webhook retries return the existing result without creating duplicate bookings.

Seat transactions require MongoDB Atlas or another replica set. A standalone local
MongoDB instance does not support them. Enable automatic payment capture in the
Razorpay account.

Configure `RAZORPAY_WEBHOOK_SECRET` in the backend and register the deployed URL
`/api/v1/payment/webhook` for the Razorpay **payment.captured** event with the same
secret. The signed webhook confirms or records a refund even if the customer's
browser closes after payment. For local development, use a publicly reachable
webhook tunnel or **Check pending payments** in Refund Alerts. The admin action
checks the oldest 100 pending orders per click; it does not issue refunds.

Complete a refund through Razorpay, then enter its reference and mark the alert
completed. This records the admin, time and optional note. Resolved alerts remain
available in their own tab.

Payment reference: [Razorpay integration steps](https://razorpay.com/docs/payments/payment-gateway/quick-integration/integration-steps/).

## Drop locations and trip duplication

Existing admin drop-point editors, passenger selection, booking storage and invoice
support are retained. Checkout now validates choices against the listed drop
locations.

**Admin → Trips → Duplicate** creates a copy and opens it for editing. It copies
trip content, images, packages, room choices, pickup/drop points and dates, with
fresh embedded IDs and no bookings. Shared-bus links are disabled in the copy;
review its dates, vehicles and interconnection settings before using it.

## Regression tests

The tests use only an isolated local MongoDB replica set on port 27019 and a fake
payment/message provider. They do not charge payments or send emails/messages.

```
mkdir -p /tmp/sunshine-test-mongo
mongod --dbpath /tmp/sunshine-test-mongo --port 27019 --bind_ip 127.0.0.1 --replSet sunshineTest
npm test
```

The test harness initializes that replica set and creates/drops only the local
`sunshine_safety_test` database. Coverage includes simultaneous payments, linked
legs, separate buses/dates, callback/webhook retries, bad payment proofs, paid
conflict retention, server pricing, duplication, message failures and templates.
