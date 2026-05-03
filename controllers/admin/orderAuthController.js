 const Order = require('../../models/Order')
 const Product = require("../../models/Product");

const orderPage=(req,res)=>{
    res.render('admin/orderManagement')
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 7, search = '', status = 'all' } = req.query

    let query = {}

    if (status !== 'all') {
      query.orderStatus = status
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


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const currentStatus = order.orderStatus;

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

    if (!allowedTransitions[currentStatus]?.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition`
      });
    }

   
    order.orderStatus = orderStatus;

   
    if (orderStatus === "Delivered") {
      order.paymentStatus = "Paid";
    }


    order.items.forEach(item => {
      if (!["Cancelled", "Returned"].includes(item.status)) {
        item.status = orderStatus;
      }
    });

    await order.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getSingleOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.productId") 
      .lean();

    if (!order) {
      return res.json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports={
    orderPage,
    getOrders,
    updateOrderStatus ,
    getSingleOrder
}