import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// API endpoint for sending emails
app.post('/api/send-email', async (req, res) => {
    const { recipient, subject, htmlBody } = req.body;

    // Check for required fields
    if (!recipient || !subject || !htmlBody) {
        return res.status(400).json({ error: 'Recipient, subject, and HTML body are required.' });
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient,
        subject: subject,
        html: htmlBody, // Use the new htmlBody field
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});