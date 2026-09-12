import nodemailer from "nodemailer";

export const sendMail = async ({
  email,
  subject,
  html,
  from = process.env.SMTP_USER,
}) => {
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      secure: Number(process.env.SMTP_PORT) === 465,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const result = await transport.sendMail({
      from,
      to: email,
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
