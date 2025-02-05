require('dotenv').config();
const nodemailer = require('nodemailer');
const { createTransport } = require('nodemailer');

// Configure SendGrid transporter
const sendGridTransporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // true for 465
  auth: {
    user: 'apikey', // This is literally the string 'apikey'
    pass: process.env.SENDGRID_API_KEY
  },
  pool: true,
  maxConnections: 10,
  maxMessages: 500,
  rateDelta: 10000, // 10 seconds
  rateLimit: 100 // 100 messages per rateDelta
});

// Add monitoring events
sendGridTransporter.on('idle', () => {
  console.log('SMTP connection pool is idle');
});

sendGridTransporter.on('error', (error) => {
  console.error('SMTP error:', error);
});

// Verify connection on startup
sendGridTransporter.verify((error) => {
  if (error) {
    console.error('SMTP connection failed:', error);
  } else {
    console.log('✅ SendGrid SMTP ready');
  }
});

// Email sending function with retry logic
const sendVerificationMail = async (email, title, token) => {
  const mailOptions = {
    from: {
      name: 'Perfumeni',
      address: process.env.EMAIL_FROM
    },
    to: email,
    subject: title,
    html: `Click <a href="${token}">here</a> to ${title}.`,
    priority: 'high'
  };

  // Retry configuration (3 attempts with exponential backoff)
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const info = await sendGridTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${email} (attempt ${retryCount + 1})`);
      return info;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        console.error(`❌ Final send failure for ${email}:`, error);
        throw error;
      }
      
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`⚠️ Retrying ${email} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = { sendVerificationMail };