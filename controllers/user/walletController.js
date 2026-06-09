const Wallet = require('../../models/Wallet');


const walletPage = (req, res) => {
    console.log("KEY:", process.env.RAZORPAY_KEY_ID); // இதை add பண்ணு
    res.render('user/wallet', {
        razorpayKey: process.env.RAZORPAY_KEY_ID
    });
}

const getWallet = async (req, res) => {
  try {
    const userId = req.session.userId;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = {
        balance: 0,
        transactions: []
      };
    }

     res.json({
  balance: wallet.balance,
  transactions: wallet.transactions || []
});

  } catch (err) {
    console.log(err);
     res.json({ balance: 0 });
  }
};




const crypto = require("crypto");

const addMoneySuccess = async (req, res) => {
  try {
    const { paymentId, orderId, signature, amount } = req.body;

    const body = orderId + "|" + paymentId;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

console.log("ORDER ID:", orderId);
console.log("PAYMENT ID:", paymentId);
console.log("SIGNATURE:", signature);
console.log("EXPECTED:", expectedSignature);

    if (expectedSignature !== signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    const userId = req.session.userId;
    
    if (!req.session.userId) {
  return res.json({ success: false, message: "User not logged in" });
}

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
    }

    const alreadyExists = wallet.transactions.find(
      txn => txn.transactionId === paymentId
    );

    if (alreadyExists) {
      return res.json({ success: false, message: "Duplicate payment" });
    }

    const verifiedAmount = Number(amount);

    wallet.balance += verifiedAmount;

    wallet.transactions.push({
      transactionId: paymentId,
      type: "credit",
      amount: verifiedAmount,
      reason: "topup"
    });

    await wallet.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
};
module.exports={
    walletPage,
    getWallet,
    addMoneySuccess
}