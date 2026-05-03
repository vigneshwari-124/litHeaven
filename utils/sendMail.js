const nodemailer=require('nodemailer')

console.log("EMAIL:", process.env.EMAIL)
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "NOT LOADED")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS // App Password
  }
});

const sendOtpMail=async(email,otp)=>{
  try {
    await transporter.sendMail({
      from: `"LitHeaven" <${process.env.EMAIL}>`,
      to: email,
      subject: "Your OTP Code",
      html: 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6f2b67;">Verify your email</h2>
          <p>Your OTP is:</p>
          <h1 style="color: #6f2b67; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 2 minutes</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>`
    });
    console.log("OTP mail sent to", email);
  } catch (err) {
    console.error("Email error:", err.message);
    throw new Error("Email sending failed");
  }
}

module.exports=sendOtpMail