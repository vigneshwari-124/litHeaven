const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  orderId: {
    type: String,
    required: true
  },

  address: {
    fullName: String,
    phone: String,
    addressLine1: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      name: String,
      author: String,
      image: String,

      language: {
       type: mongoose.Schema.Types.ObjectId,
        ref: "Language"
      },
      format: String,

      price: Number,
      quantity: Number,
      total: Number,

  
      mrp: Number,

      status: {
        type: String,
        enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
        default: "Processing"
      },

  
      cancelReason: String,
      returnReason: String
    }
  ],

  subtotal: Number,
  deliveryCharge: Number,
  discount: Number,
  totalAmount: Number,

  gst: Number,

  paymentMethod: {
    type: String,
    enum: ["COD", "Razorpay", "Wallet"],
    default: "COD"
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Refunded"], 
    default: "Pending"
  },

  orderStatus: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled", "Returned"],
    default: "Processing"
  },

  cancelReason: String,
  returnReason: String

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);