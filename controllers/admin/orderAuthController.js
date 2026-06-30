 const Order = require('../../models/Order')
 const Product = require("../../models/Product");
 const Wallet=require('../../models/Wallet')

const orderPage=(req,res)=>{
    res.render('admin/orderManagement')
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 7, search = '', status = 'all' } = req.query

    let query = {}

    if (status !== 'all') {
  if (status === 'Return Requested') {
    query['items.status'] = 'Return Requested'
  } else {
    query.orderStatus = status
  }
}

    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ]
    }

    const orders = await Order.find(query)
    .populate('userId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

       console.log("START")
      const one=await Order.countDocuments()
      console.log("One:",one)

    const total = await Order.countDocuments(query)

    res.json({
      success: true,
      orders,
      total
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
}



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



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
    transactionId: 'txn_' + Date.now(),
    type: 'credit',
    amount,
    reason: 'refund'
  });

  await wallet.save();
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateOrderStatus = async (req, res) => {
  try {

    const { orderStatus, itemId } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found"
      });
    }

    const currentStatus = order.orderStatus;

    

    const hasReturnRequest = order.items.some(
      item => item.status === "Return Requested"
    );

    if (hasReturnRequest && itemId) {

      const item = order.items.id(itemId);

      if (!item) {
        return res.json({
          success: false,
          message: "Item not found"
        });
      }

      

      if (orderStatus === "Returned") {

        item.status = "Returned";

       
      const refundAmount =
item.finalAmount ||
((item.price * item.quantity) -
(item.couponDiscount || 0));

      
        await addRefundToWallet(
          order.userId,
          refundAmount
        );

        // STOCK RETURN
        const product = await Product.findById(item.productId);

        if (product) {

          const variant = product.variants.find(v => {

            const lang = item.language || item.languageId;

            if (!v.language || !lang) return false;

            return String(v.language) === String(lang);

          });

          if (variant) {

            const formatData = variant.formats.find(
              f => f.format === item.format
            );

            if (formatData) {

              formatData.stock += item.quantity;

              formatData.sold -= item.quantity;

              recalculateOrderStatus(order);
              await product.save();

            }
           
          }
        }

        const allCompleted = order.items.every(i =>
             ["Returned","Cancelled"].includes(i.status)
        );

       if (allCompleted) {

          order.orderStatus = "Returned";

          order.paymentStatus = "Refunded";

        } else {

           recalculateOrderStatus(order);

        }

        await order.save();

        return res.json({
          success: true,
          message: "Return approved"
        });

      }

      // =====================================================
      // REJECT RETURN
      // =====================================================

      if (orderStatus === "Delivered") {

        item.status = "Delivered";

        const stillPending = order.items.some(
          i => i.status === "Return Requested"
        );


        recalculateOrderStatus(order);
        await order.save();
       

        return res.json({
          success: true,
          message: "Return rejected"
        });

      }

    }

    // =========================================================
    // NORMAL ORDER STATUS FLOW
    // =========================================================

    if (["Delivered", "Cancelled", "Returned"].includes(currentStatus)) {

      return res.status(400).json({
        success: false,
        message: `Order already ${currentStatus}`
      });

    }

   const allowedTransitions = {
  Processing: ["Shipped"],
  Shipped: ["Delivered"],
};

    console.log("Current Status:", currentStatus);
    console.log("New Status:", orderStatus);

    if (!allowedTransitions[currentStatus]?.includes(orderStatus)) {

      return res.status(400).json({
        success: false,
        message: `Invalid transition`
      });

    }

    order.orderStatus = orderStatus;
    if (
  orderStatus === "Shipped" ||
  orderStatus === "Delivered"
) {

  order.items.forEach(item => {

    if (
      item.status !== "Cancelled" &&
      item.status !== "Returned"
    ) {
      item.status = orderStatus;
    }

  });

}

    if (orderStatus === "Delivered") {
      order.paymentStatus = "Paid";
    }


    await order.save();

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }
};

const getOrderById = async (req,res)=>{
  try{

    const order = await Order.findById(req.params.id);

    if(!order){
      return res.json({
        success:false
      });
    }

    res.json({
      success:true,
      order
    });

  }catch(err){
    console.log(err);
    res.status(500).json({
      success:false
    });
  }
}

const recalculateOrderStatus = (order)=>{

 const statuses =
 order.items.map(i=>i.status)

 if(statuses.every(s=>s==="Delivered")){
   order.orderStatus="Delivered"
 }

 else if(statuses.every(s=>s==="Cancelled")){
   order.orderStatus="Cancelled"
 }

 else if(statuses.every(s=>s==="Returned")){
   order.orderStatus="Returned"
 }
else if (
  statuses.some(s => s === "Return Requested")
) {
  order.orderStatus = "Delivered";
}
else if (
  statuses.some(s => s === "Delivered")
) {
  order.orderStatus = "Delivered";
}

 else if(
 statuses.some(s=>s==="Shipped")
 ){
   order.orderStatus="Shipped"
 }

 else{
   order.orderStatus="Processing"
 }

}

const updateItemStatus = async(req,res)=>{

 try{

  const { itemId,status } = req.body

  const order =
  await Order.findById(req.params.id)

  if(!order){
    return res.json({
      success:false
    })
  }

  const item =
  order.items.id(itemId)

  if(!item){
    return res.json({
      success:false
    })
  }

  item.status = status

  recalculateOrderStatus(order)

  await order.save()

  res.json({
    success:true
  })

 }catch(err){

  console.log(err)

  res.status(500).json({
    success:false
  })

 }

}

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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports={
    orderPage,
    getOrders,
    updateOrderStatus ,
    addRefundToWallet,
    getOrderById,
    updateItemStatus,
    cancelSingleItem,
    cancelFullOrder
}