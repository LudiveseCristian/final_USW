const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// Store these in Firebase environment config
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

exports.sendEmail = functions.https.onCall(async (data, context) => {
  const { recipient, subject, body } = data;

  if (!recipient || !subject || !body) {
    throw new functions.https.HttpsError("invalid-argument", "Missing fields.");
  }

  const mailOptions = {
    from: gmailEmail,
    to: recipient,
    subject: subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Email sent successfully!" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email.");
  }
});
