const Address=require('../../models/Address')
const Cart = require('../../models/Cart');
const Order=require('../../models/Order')
const Product = require('../../models/Product');
const Coupon=require('../../models/Coupon')
const Wallet=require('../../models/Wallet')
const Offer=require('../../models/Offers')
const razorpay = require("../../config/razorpay");


const checkoutPage = async (req, res) => {

  const userId = req.session.userId;

  const cart = await Cart.findOne({ userId });

  if (!cart || cart.items.length === 0) {

    return res.redirect("/cart");

  }

  res.render("user/checkout");

}

const getAvailableCoupons = async (req,res)=>{
  try{

    const today = new Date()
    today.setHours(0,0,0,0)

    const allCoupons = await Coupon.find({
      status:"active"
    })

    const coupons = allCoupons.filter(coupon=>{

      const start = new Date(coupon.startDate)
      start.setHours(0,0,0,0)

      const end = new Date(coupon.endDate)
      end.setHours(0,0,0,0)

      return today <= end

    })

    res.json({
      success:true,
      coupons
    })

  }catch(err){
    console.log("Coupon error:",err)

    res.json({
      success:false
    })
  }
}

const applyCoupon=async(req,res)=>{
  try{

    let {code,cartTotal}=req.body
    code=code.toUpperCase()
    const coupon = await Coupon.findOne({code})


    if (!coupon) {
      return res.json({
        success: false,
        message: "Invalid coupon code"
      });
    }

    const today=new Date()
    today.setHours(0,0,0,0)

    const end=new Date(coupon.endDate)
    end.setHours(0,0,0,0)

    const start = new Date(coupon.startDate);
    start.setHours(0,0,0,0);


     if (end< today) {
      return res.json({
        success: false,
        message: "Coupon expired"
      });
    }

    if(start>today){
      return res.json({
        success:false,
        message:"Coupon Coming Soon"
      })
    }

    if(cartTotal<coupon.minPurchase){
      return res.json({
        success:false,
        message:`Minimum ₹${coupon.minPurchase} required`
      })
    }

    let discount=(cartTotal*coupon.discountPct)/100

    if(discount>coupon.maxDiscount){
      discount=coupon.maxDiscount
    }

    return res.json({
      success:true,
      discount,
      message:"Coupon applied successfully"
    })
    

  }catch(err){
    console.log(err)
    res.status(500).json({message:"something went wrong"})
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const deductFromWallet = async (userId, amount) => {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet || wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balance -= amount;

  wallet.transactions.push({
    transactionId: 'txn_' + Date.now(),
    type: 'debit',
    amount,
    reason: 'purchase'
  });

  await wallet.save();
};

const reduceStock = async (items) => {

  for (const item of items) {

    const product = await Product.findById(item.productId)

    if (!product) continue

    const variant = product.variants.find(v => {

      const lang = item.language || item.languageId

      if (!v.language || !lang) return false

      return String(v.language) === String(lang)

    })

    if (!variant) continue

    const formatData = variant.formats.find(f =>
      f.format === item.format
    )

    if (!formatData) continue

    formatData.stock -= item.quantity

    formatData.sold += item.quantity

    await product.save()

  }

}

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { addressId, paymentMethod, couponCode } = req.body;

    const paymentMap = {
      'cod': 'COD',
      'razorpay': 'Razorpay',
      'wallet': 'Wallet'
    };
    const fixedPayment = paymentMap[paymentMethod.toLowerCase()] || 'COD';

    if (!userId) return res.status(401).json({ success: false, message: "Login required" });
    if (!addressId) return res.json({ success: false, message: "Select address" });

    const address = await Address.findById(addressId);
    if (!address) return res.json({ success: false, message: "Invalid address" });

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "author" },
          { path: "variants.language" },
          { path: "category" },
          { path: "subCategory" }
        ]
      })
      .populate("items.languageId");

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart empty" });
    }

    const now = new Date()
    const offers = await Offer.find({
      isListed: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;

      const variant = product.variants.find(v => {
        const vLang = v.language?._id
          ? v.language._id.toString()
          : v.language.toString();
        const cartLang = item.languageId?._id
          ? item.languageId._id.toString()
          : item.languageId.toString();
        return vLang === cartLang;
      });

      if (!variant) throw new Error("Variant not found");

      const formatData = variant.formats.find(f => f.format === item.format);
      if (!formatData) throw new Error("Format not found");

      if (formatData.stock < item.quantity) {
    return res.status(200 ).json({
        success: false,
        outOfStock: true,
        message: `${product.title} is out of stock`
    });
}

      const originalPrice = formatData.price;

      const pid      = product._id.toString()
      const subCatId = product.subCategory?._id?.toString()
      const catId    = product.category?._id?.toString()

      const productOffer = offers.find(o =>
        o.type === "product" && o.product?.toString() === pid
      )
      const subOffer = offers.find(o =>
        o.type === "subcategory" && o.subCategory?.toString() === subCatId
      )
      const catOffer = offers.find(o =>
        o.type === "category" && o.category?.toString() === catId
      )

      let itemDiscount = 0

const offerList = []

if(productOffer){

  offerList.push(productOffer.discount)

}

if(subOffer){

  offerList.push(subOffer.discount)

}

if(catOffer){

  offerList.push(catOffer.discount)

}

if(offerList.length > 0){

  itemDiscount = Math.max(...offerList)

}

      const offerPrice = itemDiscount > 0
        ? Math.round(originalPrice - (originalPrice * itemDiscount / 100))
        : originalPrice

      const total = offerPrice * item.quantity;
      subtotal += total;

       

      orderItems.push({
        productId:     product._id,
        name:          product.title,
        author:        product.author?.name,
        image:         variant?.thumbnail?.url,
        language:      item.languageId,
        format:        item.format,
        price:         offerPrice,
        originalPrice,
        discount:      itemDiscount,
        quantity:      item.quantity,
        total,
        status:        "Processing"
      });
    }

    let couponDiscount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() })

      if (coupon) {
        const today = new Date()
        today.setHours(0,0,0,0)
        const end = new Date(coupon.endDate)
        end.setHours(0,0,0,0)

        if (end >= today && subtotal >= coupon.minPurchase) {
          couponDiscount = Math.min(
            Math.round((subtotal * coupon.discountPct) / 100),
            coupon.maxDiscount
          )
        }
      }
    }

    const offerDiscount = orderItems.reduce((sum, item) => {
      return sum + ((item.originalPrice - item.price) * item.quantity)
    }, 0)

    const delivery    = 40;
    const discount    = couponDiscount;

    if (couponDiscount > 0) {

  orderItems.forEach(item => {

    item.couponDiscount = Math.round(
      (item.total / subtotal) * couponDiscount
    );

    item.finalAmount = item.total - item.couponDiscount;

  });

}

    const totalAmount = subtotal + delivery - discount;

    console.log("SUBTOTAL:", subtotal)
    console.log("DELIVERY:", delivery)
    console.log("COUPON DISCOUNT:", discount)
    console.log("FINAL:", totalAmount)

    if (fixedPayment === "COD") {
      if (totalAmount < 500) {
        return res.json({
          success: false,
          message: `COD available only for orders above ₹500. Your total is ₹${totalAmount}`
        });
      }
      if (totalAmount > 5000) {
        return res.json({ success: false, message: "COD not available above ₹5000" });
      }
    }

  
    if (fixedPayment === "Wallet") {
      await deductFromWallet(userId, totalAmount);
    }

    

    let paymentStatus = "Pending";

if (fixedPayment === "Wallet") {
  paymentStatus = "Paid";
}

if (fixedPayment === "Razorpay") {
  paymentStatus = "Pending";
}

if (fixedPayment === "COD") {
  paymentStatus = "Pending";
}
    const order = await Order.create({
      userId,
      orderId: "LH" + Date.now(),
      address: {
        fullName:     address.fullName,
        addressLine1: address.addressLine1,
        city:         address.city,
        state:        address.state,
        zip:          address.zip,
        country:      address.country
      },
      items:          orderItems,
      subtotal,
      offerDiscount, 
      deliveryCharge: delivery,
      discount,
      totalAmount,
      paymentMethod:  fixedPayment,
      paymentStatus,
      orderStatus:    "Processing"
    });

    if (fixedPayment !== "Razorpay") {
  cart.items = [];
  await cart.save();
}

 if (fixedPayment === "COD" || fixedPayment === "Wallet") {
  await reduceStock(order.items);
}

 
    if (fixedPayment === "Razorpay") {
      return res.json({
        success:       true,
        razorpay:      true,
        orderId:       order._id,
        amount:        totalAmount,
        razorpayKey:   process.env.RAZORPAY_KEY_ID,
        paymentMethod: order.paymentMethod,
        itemCount:     order.items.length
      });
    }

    res.json({
      success:       true,
      orderId:       order.orderId,
      totalAmount:   order.totalAmount,
      paymentMethod: order.paymentMethod,
      itemCount:     order.items.length
    });

  } catch (err) {
    console.log("ORDER ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const checkStock = async (req, res) => {
 console.log("CHECK STOCK API CALLED");
 
   const cart = await Cart.findOne({ userId: req.session.userId })
      .populate({
         path: "items.productId",
         populate: { path: "variants.language" }
      });

   for (const item of cart.items) {

      const product = item.productId;

      const variant = product.variants.find(v => {

   const vLang = v.language?._id
      ? v.language._id.toString()
      : v.language.toString();

   const cartLang = item.languageId?._id
      ? item.languageId._id.toString()
      : item.languageId.toString();

   return vLang === cartLang;

});

if (!variant) continue;

const format = variant.formats.find(f =>
   f.format === item.format
);

if (!format) continue;

if (format.stock < item.quantity) {

   return res.json({
      outOfStock: true,
      message: `${product.title} is out of stock`
   });

}
   }

   res.json({
      outOfStock: false
   });

}

const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    order.paymentStatus = "Paid";
    order.orderStatus = "Processing";
    await reduceStock(order.items)

    await order.save();

    const cart = await Cart.findOne({ userId: order.userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
};


const paymentFailed = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    order.paymentStatus = "Failed";


    await order.save();

     const cart = await Cart.findOne({ userId: order.userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
};



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const orderPage= (req,res)=>{
 res.render('user/order')
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
   

    const { search, status } = req.query;

    
    let query = { userId };

    
    if (search) {
      query.orderId = { $regex: search, $options: "i" };
    }

    if (status && status !== "all") {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 });
      console.log(orders)

     

    res.json({
       success: true,
        orders 
      });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      orders: []
    });
  }
};




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.status === "Cancelled") {
      return res.status(400).json({ message: "Item already cancelled" });
    }

    if (!["Processing", "Shipped"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Cannot cancel at this stage" });
    }

    item.status = "Cancelled";
    item.cancelReason = reason || "";

    const shouldRefund =
      order.paymentStatus === "Paid" &&
      ["Razorpay", "Wallet", "COD"].includes(order.paymentMethod);

  
    const allCancelled = order.items.every(i => i.status === "Cancelled");
if (shouldRefund) {

  if (allCancelled) {

    const refundAmount = order.items.reduce((sum,item)=>{
   return sum + item.finalAmount
},0)

    await addRefundToWallet(
      order.userId,
      refundAmount + order.deliveryCharge
    );

  } else {

    const itemRefund =
item.finalAmount ||
((item.price * item.quantity) -
(item.couponDiscount || 0));

    await addRefundToWallet(
      order.userId,
      itemRefund
    );

  }

}

    if (allCancelled) {
      order.orderStatus = "Cancelled";
      if (shouldRefund) {
        order.paymentStatus = "Refunded";
      } else if (order.paymentMethod === "COD") {
        order.paymentStatus = "Failed";
      }
    }

    const product = await Product.findById(item.productId);
    if (product) {
      const variant = product.variants.find(v => {
        const lang = item.language || item.languageId;
        if (!v.language || !lang) return false;
        return String(v.language) === String(lang);
      });
      if (variant) {
        const formatData = variant.formats.find(f => f.format === item.format);
        if (formatData) {
          formatData.stock += item.quantity;
          formatData.sold -= item.quantity;
          await product.save();
        }
      }
    }

    await order.save();
    return res.status(200).json({ success: true, message: "Item cancelled", order });

  } catch (err) {
    console.log("CANCEL ITEM ERROR:", err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



const cancelFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Already cancelled" });
    }

    if (!["Processing", "Shipped"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Cannot cancel at this stage" });
    }

    const shouldRefund =
      order.paymentStatus === "Paid" &&
      ["Razorpay", "Wallet", "COD"].includes(order.paymentMethod);

    if (shouldRefund) {

  const activeItems = order.items.filter(
  item => item.status !== "Cancelled"
)

const refundAmount = activeItems.reduce((sum,item)=>{

 return sum + (
   item.finalAmount ||
   ((item.price * item.quantity) -
   (item.couponDiscount || 0))
 )

},0)

  await addRefundToWallet(
    order.userId,
    refundAmount + order.deliveryCharge
  )



  order.paymentStatus = "Refunded";

} else if (order.paymentMethod === "COD") {

  order.paymentStatus = "Failed";

}

    order.orderStatus = "Cancelled";
    order.cancelReason = reason || "";

  for (const item of order.items) {

  if (
    item.status === "Delivered" ||
    item.status === "Cancelled"
  ) continue;

      const product = await Product.findById(item.productId);
      if (!product) continue;

      const variant = product.variants.find(v => {
        const lang = item.language || item.languageId;
        if (!v.language || !lang) return false;
        return String(v.language) === String(lang);
      });
      if (!variant) continue;

      const formatData = variant.formats.find(f => f.format === item.format);
      if (!formatData) continue;

      formatData.stock += item.quantity;
      formatData.sold -= item.quantity;
      await product.save();
    }

    order.items.forEach(item => {
      if (item.status !== "Delivered") {
        item.status = "Cancelled";
        item.cancelReason = reason || "";
      }
    });

    await order.save();
    return res.status(200).json({ success: true, message: "Order cancelled", order });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const returnItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Only delivered items can be returned" });
    }

    item.status = "Return Requested";
    
    item.returnReason = reason || "";
   
    await order.save();
    return res.status(200).json({ success: true, message: "Item returned", order });

  } catch (err) {
    console.log("RETURN ITEM ERROR:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};
 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const addRefundToWallet = async (userId, amount) => {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = new Wallet({
      userId,
      balance: 0,
      transactions: []
    });
  }

  wallet.balance += amount;

  wallet.transactions.push({
    transactionId: 'refund_' + Date.now(),
    type: 'credit',
    amount,
    reason: 'refund'
  });

  await wallet.save();

  console.log("REFUND ADDED:", amount); 
};

////////////////////////////////////////////////////////////////////////////////////

const returnFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "Returned") {
      return res.status(400).json({ message: "Already returned" });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Return reason is required" });
    }

    order.orderStatus = "Return Requested";
    order.returnReason = reason;
   
   order.items.forEach(item => {

  if(item.status === "Delivered"){

    item.status = "Return Requested";
    item.returnReason = reason;

  }

});
    await order.save();
    return res.status(200).json({ success: true, message: "Full order returned", order });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const retryPayment = async (req, res) => {
  try {

    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentStatus !== "Failed") {
      return res.status(400).json({
        success: false,
        message: "Only failed orders can be retried"
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: order.orderId,
      notes: {
        appOrderId: order._id.toString()
      }
    });

    res.json({
      success: true,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      razorpayOrder,
      orderId: order._id
    });

  } catch (err) {
    console.log("RETRY PAYMENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const checkStockStatus = async (req, res) => {
  try {
    const userId = req.session.userId;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [{ path: "variants.language" }]
      })
      .populate("items.languageId");

    if (!cart || cart.items.length === 0) {
      return res.json({ outOfStock: false });
    }

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) continue;

      const variant = product.variants.find(v => {
        const vLang = v.language?._id ? v.language._id.toString() : v.language.toString();
        const cartLang = item.languageId?._id ? item.languageId._id.toString() : item.languageId.toString();
        return vLang === cartLang;
      });

      if (!variant) continue;

      const formatData = variant.formats.find(f => f.format === item.format);

      if (!formatData || formatData.stock < item.quantity) {
        return res.json({
          outOfStock: true,
          message: `${product.title} is out of stock`
        });
      }
    }

    return res.json({ outOfStock: false });

  } catch (err) {
    console.log("CHECK STOCK ERROR:", err);
    res.status(500).json({ outOfStock: false });
  }
};


module.exports={
    checkoutPage,
    checkStockStatus,
    checkStock,
    placeOrder,
    orderPage,
    getUserOrders,
    cancelSingleItem ,
    cancelFullOrder,
    returnItem ,
    returnFullOrder ,
    getAvailableCoupons,
    applyCoupon,
    verifyPayment,
    paymentFailed,
    retryPayment
}