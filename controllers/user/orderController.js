const Address=require('../../models/Address')
const Cart = require('../../models/Cart');
const Order=require('../../models/Order')
const Product = require('../../models/Product');
const Coupon=require('../../models/Coupon')

const checkoutPage=(req,res)=>{
    res.render('user/checkout')
}

const getAvailableCoupons=async (req,res)=>{
  try{
    const today=new Date()
    const coupons=await Coupon.find({
      status:"active"
    })
    res.json({
      success: true,
      coupons
    });

  }catch(err){
    console.log("Coupon error:", err);
    res.json({success:false})
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

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { addressId, paymentMethod } = req.body;

    const fixedPayment = paymentMethod.toUpperCase();


    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    if (!addressId) {
      return res.json({ success: false, message: "Select address" });
    }

    const address = await Address.findById(addressId);
    if (!address) {
      return res.json({ success: false, message: "Invalid address" });
    }

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "author" },
          { path: "variants.language" }
        ]
      })
      .populate("items.languageId");

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart empty" });
    }

    let subtotal = 0;
    const orderItems = [];

    
    for (const item of cart.items) {
      const product = item.productId;

      const variant = product.variants.find(v => {
        const lang = item.language || item.languageId;
        return String(v.language) === String(lang);
      });

      if (!variant) {
        throw new Error("Variant not found");
      }

      const formatData = variant.formats.find(f =>
        f.format === item.format
      );

      if (!formatData) {
        throw new Error("Format not found");
      }

      if (formatData.stock < item.quantity) {
        throw new Error(`${product.title} out of stock`);
      }
      formatData.stock -= item.quantity;

      formatData.sold += item.quantity;

      await product.save();

      const price = formatData.price;
      const total = price * item.quantity;

      subtotal += total;

    
      orderItems.push({
        productId: product._id,
        name: product.title,
        author: product.author?.name,
        image: variant?.thumbnail?.url,

        language: item.languageId,
        format: item.format,

        price,
        quantity: item.quantity,
        total,

        status: "Processing"
      });
    }

    const delivery = 40;
    const totalAmount = subtotal + delivery;

 
    const order = await Order.create({
      userId,
      orderId: "LH" + Date.now(),

      address: {
        fullName: address.fullName,
        addressLine1: address.addressLine1,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country
      },

      items: orderItems,

      subtotal,
      deliveryCharge: delivery,
      discount: 0,
      totalAmount,

      paymentMethod: fixedPayment
    });

 
    cart.items = [];
    await cart.save();

   
    res.json({
      success: true,
      total: totalAmount,
      orderId: order.orderId
    });

  } catch (err) {
    console.log("ORDER ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
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
     

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.status === "Cancelled") {
      return res.status(400).json({ message: "Item already cancelled" });
    }

    if (!["Processing", "Shipped"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    item.status = "Cancelled";
    item.cancelReason = reason || "";

    
    const allCancelled = order.items.every(i => i.status === "Cancelled");

    if (allCancelled) {
      order.orderStatus = "Cancelled";


      if (order.paymentMethod === "COD") {
        order.paymentStatus = "Failed";
      }
    }

    const product = await Product.findById(item.productId);

if (!product) {
  return res.status(400).json({
    success: false,
    message: "Product not found"
  });
}

const variant = product.variants.find(v => {
  const lang = item.language || item.languageId;

  if (!v.language || !lang) return false;

  return String(v.language) === String(lang);
});

if (!variant) {
  return res.status(400).json({
    success: false,
    message: "Variant not found"
  });
}

const formatData = variant.formats.find(f =>
  f.format === item.format
);

if (!formatData) {
  return res.status(400).json({
    success: false,
    message: "Format not found"
  });
}

formatData.stock += item.quantity;
formatData.sold -= item.quantity;

await product.save();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Item cancelled successfully",
      order
    });

  } catch (err) {
    console.log("CANCEL ITEM ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const cancelFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Order already cancelled" });
    }

    if (!["Processing", "Shipped"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage"
      });
    }

    order.orderStatus = "Cancelled";
    order.cancelReason = reason || "";

    if (order.paymentMethod === "COD") {
      order.paymentStatus = "Failed";
    }

    for (const item of order.items) {

  
  if (item.status === "Delivered") {

    const product = await Product.findById(item.productId);
    if (!product) continue;

 const variant = product.variants.find(v => {
  const lang = item.language || item.languageId;

  if (!v.language || !lang) return false;

  return String(v.language) === String(lang);
});

    if (!variant) continue;

    const formatData = variant.formats.find(f =>
      f.format === item.format
    );

    if (!formatData) continue;

  
    formatData.stock += item.quantity;
    formatData.sold -= item.quantity;

    await product.save();
  }
}

    order.items.forEach(item => {
      item.status = "Cancelled";
      item.cancelReason = reason || "";
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order
    });

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
      return res.status(400).json({
        success: false,
        message: "Only delivered items can be returned"
      });
    }

    
    item.status = "Returned";
    item.returnReason = reason || "";

    
    const allReturned = order.items.every(i => i.status === "Returned");

    if (allReturned) {
      order.orderStatus = "Returned";
      order.returnReason = reason || "";

     
      order.paymentStatus = "Refunded";
    }

    const product = await Product.findById(item.productId);

if (!product) {
  return res.status(400).json({
    success: false,
    message: "Product not found"
  });
}

const variant = product.variants.find(v => {
  const lang = item.language || item.languageId;

  if (!v.language || !lang) return false;

  return String(v.language) === String(lang);
});
if (!variant) {
  return res.status(400).json({
    success: false,
    message: "Variant not found"
  });
}

const formatData = variant.formats.find(f =>
  f.format === item.format
);

if (!formatData) {
  return res.status(400).json({
    success: false,
    message: "Format not found"
  });
}


formatData.stock += item.quantity;
formatData.sold -= item.quantity;

await product.save();

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Item returned successfully",
      order
    });

  } catch (err) {
    console.log("RETURN ITEM ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const returnFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    
    if (order.orderStatus === "Returned") {
      return res.status(400).json({ message: "Order already returned" });
    }

    
    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({
        message: "Only delivered orders can be returned"
      });
    }

    
    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        message: "Return reason is required"
      });
    }

    
    order.orderStatus = "Returned";
    order.returnReason = reason;
    order.paymentStatus = "Refunded";

    for (const item of order.items) {

  const product = await Product.findById(item.productId);
  if (!product) continue;

const variant = product.variants.find(v => {
  const lang = item.language || item.languageId;

  if (!v.language || !lang) return false;

  return String(v.language) === String(lang);
});

  if (!variant) continue;

  const formatData = variant.formats.find(f =>
    f.format === item.format
  );

  if (!formatData) continue;

  
  formatData.stock += item.quantity;
  formatData.sold -= item.quantity;

  await product.save();
}

    
    order.items.forEach(item => {
      item.status = "Returned";
      item.returnReason = reason;
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Full order returned successfully",
      order
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error"
    });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
    checkoutPage,
    placeOrder,
    orderPage,
    getUserOrders,
    cancelSingleItem ,
    cancelFullOrder,
    returnItem ,
    returnFullOrder ,
    getAvailableCoupons,
     applyCoupon
    
}