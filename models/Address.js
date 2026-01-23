const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  fullName: {
    type: String,
    required: true
  },
  addressLine1: {
    type: String,
    required: true
  },

  addressLine2: {
    type: String
  },

  city: {
    type: String,
    required: true
  },

  state: {
    type: String,
    required: true
  },

  zip: {
    type: String,
    required: true
  },

  country: {
    type: String,
    default: 'India'
  },

  type: {
    type: String,
    enum: ['Home', 'Office', 'Other'],
    default: 'Home'
  },

  isPrimary: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);
