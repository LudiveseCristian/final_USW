
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Ensure these are stored in Firebase environment config
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailEmail,
        pass: gmailPassword,
    },
});

exports.sendWelcomeEmailOnSignUp = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap) => {
        const newUser = snap.data();
        const recipientEmail = newUser.email;
        const recipientName = newUser.firstName || "New User"; // Fallback name

        // Check if an email address exists before proceeding
        if (!recipientEmail) {
            console.log("No email address found for the new user, skipping welcome email.");
            return null;
        }

        // Email content with HTML formatting and green highlights
        const subject = `Welcome to UpcycledStreetwear, ${recipientName}! 🌱`;
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4; padding: 20px; text-align: center;">
                <table style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="color: #22c55e; font-size: 28px; margin-bottom: 20px;">Welcome to the Family!</h1>
                            <p style="font-size: 16px; color: #555;">Hello ${recipientName},</p>
                            <p style="font-size: 16px; color: #555;">Thank you for joining UpcycledStreetwear! We're thrilled to have you as part of our community. Get ready to explore unique, sustainably crafted streetwear.</p>
                            <p style="font-size: 16px; color: #555; margin-bottom: 30px;">Start your journey now by browsing our latest collections!</p>
                            <a href="[Your App's Homepage URL]" style="display: inline-block; padding: 12px 25px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Shop Now
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; border-top: 1px solid #eee; text-align: left; font-size: 14px; color: #888;">
                            <p>---</p>
                            <p>This email was sent from the administration panel of UpcycledStreetwear.</p>
                            <p>If you have questions, please feel free to reply to this email, message us on the UpcycledStreetwear App or send us a DM on our Instagram: <a href="https://www.instagram.com/upcycled_streetwear/" style="color: #22c55e; text-decoration: none;">upcycled_streetwear</a></p>
                            <p style="margin-top: 20px; font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} UpcycledStreetwear. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </div>
        `;

        const mailOptions = {
            from: `"UpcycledStreetwear" <${gmailEmail}>`,
            to: recipientEmail,
            subject: subject,
            html: htmlBody,
        };

        // Send the email
        try {
            await transporter.sendMail(mailOptions);
            console.log("Welcome email sent to:", recipientEmail);
            return null;
        } catch (error) {
            console.error("Error sending welcome email:", error);
            return null; // Return null to indicate the function has completed
        }
    });
