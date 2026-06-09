const razorpay = require("../config/razorpay");

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, orderId } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount required" });
    }

    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: orderId || "rcpt_" + Date.now(),
       notes: {
        appOrderId: orderId
      }
    };

    console.log("RAZORPAY OPTIONS:", options)
    const order = await razorpay.orders.create(options);

    console.log("RAZORPAY ORDER:", order);

    res.json({
      success: true,
      order
    });

  } catch (err) {
    console.log("Razorpay error:", err);
    res.status(500).json({ success: false });
  }
};

module.exports = { createRazorpayOrder };