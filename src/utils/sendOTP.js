import nodemailer from "nodemailer";

// Hostinger only accepts mail whose envelope sender is the authenticated mailbox.
const mailboxAddress = () => process.env.SMTP_USER;

export const sendMail = async ({
  email,
  subject,
  html,
  from,
  replyTo,
}) => {
  const sender = mailboxAddress();
  if (!sender) {
    throw new Error("SMTP_USER is not configured");
  }

  // A caller-supplied From that is not this mailbox cannot be used as MAIL FROM.
  // Keep it as Reply-To so contact-form replies still reach the visitor.
  const reply = replyTo || (from && from !== sender ? from : undefined);

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      secure: Number(process.env.SMTP_PORT) === 465,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: sender,
        pass: process.env.SMTP_PASS,
      },
    });

    const result = await transport.sendMail({
      from: `"Sunshine Holiday Packages" <${sender}>`,
      to: email,
      replyTo: reply,
      envelope: {
        from: sender,
        to: email,
      },
      subject,
      html,
    });

    console.log(`Email sent to ${email}`);
    return result;
  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    // Optionally throw the error to handle it at a higher level
    throw error;
  }
};
