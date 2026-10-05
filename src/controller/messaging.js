import { TryCatch } from "../middleware/error.js";
import { bookingError } from "../services/bookingSafety.js";
import { messagingConfig, normalizePhones, sendProviderMessage } from "../services/messaging.js";
import MessageTemplate from "../model/MessageTemplate.js";
import MessageBatch from "../model/MessageBatch.js";
function templateFields(body) {
  const name = String(body.name || "").trim();
  const message = String(body.message || "").trim();
  const contentSid = String(body.contentSid || "").trim();
  if (!name || name.length > 100 || !message || message.length > 1600) throw bookingError("Enter a template name (up to 100 characters) and message (up to 1600 characters)");
  if (contentSid && !/^HX[a-f0-9]{32}$/i.test(contentSid)) throw bookingError("Invalid WhatsApp content template SID");
  return {
    name,
    message,
    contentSid
  };
}
export const getMessaging = TryCatch(async (_req, res) => {
  const templates = await MessageTemplate.find().sort({
    updatedAt: -1
  }).lean();
  const batches = await MessageBatch.find().sort({
    createdAt: -1
  }).limit(20).lean();
  res.json({
    templates,
    batches,
    configured: messagingConfig()
  });
});
export const createTemplate = TryCatch(async (req, res) => {
  const template = await MessageTemplate.create({
    ...templateFields(req.body),
    createdBy: req.user._id
  });
  res.status(201).json({
    template
  });
});
export const editTemplate = TryCatch(async (req, res) => {
  const template = await MessageTemplate.findByIdAndUpdate(req.params.id, {
    $set: templateFields(req.body)
  }, {
    new: true,
    runValidators: true
  });
  if (!template) throw bookingError("Template not found", 404);
  res.json({
    template
  });
});
export const deleteTemplate = TryCatch(async (req, res) => {
  if (!(await MessageTemplate.findByIdAndDelete(req.params.id))) throw bookingError("Template not found", 404);
  res.json({
    success: true
  });
});
export const sendMessages = TryCatch(async (req, res) => {
  const {
    channel,
    requestId
  } = req.body;
  if (!["sms", "whatsapp"].includes(channel)) throw bookingError("Select WhatsApp or SMS");
  if (!messagingConfig()[channel]) throw bookingError(`${channel === "sms" ? "SMS" : "WhatsApp"} sending is not configured. Ask your administrator to configure the messaging account.`, 503);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId || "")) throw bookingError("Invalid send request ID");
  const phones = normalizePhones(req.body.phones);
  const message = String(req.body.message || "").trim();
  const contentSid = String(req.body.contentSid || "").trim();
  if (!message || message.length > 1600) throw bookingError("Enter a message up to 1600 characters");
  if (contentSid && !/^HX[a-f0-9]{32}$/i.test(contentSid)) throw bookingError("Invalid WhatsApp content template SID");
  let batch;
  try {
    batch = await MessageBatch.create({
      requestId,
      channel,
      message,
      contentSid,
      createdBy: req.user._id,
      results: phones.map(phone => ({
        phone,
        status: "pending"
      }))
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    batch = await MessageBatch.findOne({
      requestId
    });
    return res.json({
      batch,
      message: "This send request was already submitted; messages were not sent again."
    });
  }
  // Persist each result immediately. Interrupted requests remain pending in the
  // audit history and must be checked with the provider before any manual retry.
  for (let index = 0; index < phones.length; index++) {
    let result;
    try {
      result = await sendProviderMessage(channel, phones[index], message, contentSid);
    } catch {
      result = {
        phone: phones[index],
        status: "unknown",
        error: "Provider result unavailable. Check provider history before retrying."
      };
    }
    await MessageBatch.updateOne({
      _id: batch._id
    }, {
      $set: {
        [`results.${index}`]: result
      }
    });
  }
  res.json({
    batch: await MessageBatch.findById(batch._id)
  });
});
