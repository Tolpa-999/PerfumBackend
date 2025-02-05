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
    subject: `${title} - Perfumeni Account Security`, 
    text: `Please verify your email by clicking: <a href="${token}">here</a> \n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="color: #2d3748;">Perfumeni Account Security</h2>
        <p>Please click the button below to ${title}:</p>
        <a href="${token}" 
           style="display: inline-block; padding: 12px 24px; 
                  background-color: #4299e1; color: white; 
                  text-decoration: none; border-radius: 4px;
                  margin: 20px 0;">
          Verify Email Address
        </a>
        <p style="color: #718096; font-size: 14px;">
          If you didn't request this email, you can safely ignore it.
        </p>
        <hr style="border: 1px solid #e2e8f0; margin: 24px 0;">
        <div style="text-align: center; color: #718096; font-size: 12px;">
          <p>Perfumeni Inc, 123 Perfume Street, Paris, France</p>
          <p><a href="${process.env.BASE_URL}/unsubscribe" style="color: #4299e1;">Unsubscribe</a></p>
        </div>
      </div>
    `,
    priority: 'high',
    headers: {
      'X-Entity-Ref-ID': 'perfumeni-verification-1'
    }
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