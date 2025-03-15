// Install: npm install nodemailer

// Create /workspaces/vidify-backend/services/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendWelcomeEmail = async (user) => {
  await transporter.sendMail({
    from: '"Vidify" <support@vidify.com>',
    to: user.email,
    subject: 'Welcome to Vidify!',
    html: `
      <h1>Welcome to Vidify, ${user.firstName}!</h1>
      <p>Thank you for signing up. You're now ready to create amazing avatar videos!</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a></p>
    `
  });
};

const sendSubscriptionEmail = async (user, plan) => {
  await transporter.sendMail({
    from: '"Vidify" <support@vidify.com>',
    to: user.email,
    subject: `Your Vidify ${plan.name} Subscription`,
    html: `
      <h1>Thank You for Your Subscription!</h1>
      <p>You now have access to our ${plan.name} plan with ${plan.monthlyLimit} videos per month.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">Start Creating Videos</a></p>
    `
  });
};

// Add other email templates as needed

module.exports = {
  sendWelcomeEmail,
  sendSubscriptionEmail
};