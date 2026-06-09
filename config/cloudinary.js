const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  // ⭐ NEW: Add timeout for faster uploads
  secure: true,
  upload_timeout: 100000  // 2 minutes
});

module.exports = cloudinary;