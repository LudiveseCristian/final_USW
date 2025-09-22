const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin"); // Added for potential future database access

// Initialize Firebase Admin SDK (if not already done)
admin.initializeApp();

// Ensure these are stored in Firebase environment config
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

exports.sendEmail = functions.https.onCall(async (data) => {
  // 1. Validate the input data
  const { recipients, subject, htmlBody } = data;

  if (!recipients || !subject || !htmlBody) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'recipients' array, a 'subject', and an 'htmlBody'.");
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "The 'recipients' field must be a non-empty array of email addresses.");
  }
  
  // 2. Validate and filter out invalid email addresses
  const validRecipients = recipients.filter(email => {
    // A simple regex for email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof email === 'string' && emailRegex.test(email);
  });

  if (validRecipients.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "No valid email addresses found in the recipients list.");
  }

  // 3. Configure the email
  const mailOptions = {
    from: `"Your App Name" <${gmailEmail}>`, // A user-friendly name for the sender
    to: validRecipients.join(', '), // Nodemailer can handle a comma-separated string for multiple recipients
    subject: subject,
    html: htmlBody, // Use HTML for rich formatting
  };

  // 4. Send the email and handle errors
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    
    // Log any rejected emails for debugging
    if (info.rejected && info.rejected.length > 0) {
      console.warn("Emails rejected:", info.rejected);
    }
    
    return { success: true, message: `Email sent to ${info.accepted.length} recipients.` };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email. Check function logs for details.");
  }
});