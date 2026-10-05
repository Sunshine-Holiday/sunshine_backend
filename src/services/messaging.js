import { bookingError } from "./bookingSafety.js";
export function normalizePhones(value) {
  const tokens = Array.isArray(value) ? value : String(value || "").split(/[\n,;]+/);
  const phones = tokens.filter(raw => String(raw).trim()).map(raw => {
    let phone = String(raw).trim().replace(/[\s()-]/g, "");
    if (/^[6-9]\d{9}$/.test(phone)) phone = `+91${phone}`;
    if (/^91\d{10}$/.test(phone)) phone = `+${phone}`;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw bookingError(`Invalid phone number: ${String(raw).trim() || "empty"}. Use +country code or a 10-digit Indian number.`);
    return phone;
  });
  const unique = [...new Set(phones)];
  if (!unique.length || unique.length > 100) throw bookingError("Enter between 1 and 100 phone numbers");
  return unique;
}
export function messagingConfig() {
  const credentials = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  return {
    sms: credentials && Boolean(process.env.TWILIO_SMS_FROM),
    whatsapp: credentials && Boolean(process.env.TWILIO_WHATSAPP_FROM)
  };
}
export async function sendProviderMessage(channel, phone, message, contentSid) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const from = channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_FROM.replace(/^whatsapp:/, "") : process.env.TWILIO_SMS_FROM;
  const body = new URLSearchParams({
    From: channel === "whatsapp" ? `whatsapp:${from}` : from,
    To: channel === "whatsapp" ? `whatsapp:${phone}` : phone
  });
  if (channel === "whatsapp" && contentSid) body.set("ContentSid", contentSid);else body.set("Body", message);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok) return {
    phone,
    status: "failed",
    error: result.message || "Provider rejected the message"
  };
  return {
    phone,
    status: result.status || "queued",
    providerId: result.sid
  };
}
