require("dotenv").config();
const nodemailer = require("nodemailer");

// ✅ Create a Nodemailer Transporter with Gmail
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use an App Password
    },
    pool: true, // ✅ Enables connection reuse for faster email sending
    maxConnections: 5, // Limits the number of connections (tune this if needed)
    maxMessages: 100, // Maximum messages per connection
});

// ✅ Function to Send Email
const sendVerificationMail = async (email, title, token) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: title,
            html: `Click <a href="${token}">here</a> to ${title}.`,
        });
        console.log(`📧 Email sent successfully to ${email}`);
    } catch (error) {
        console.error(`❌ Email sending failed: ${error.message}`);
    }
};

module.exports = { sendVerificationMail };
