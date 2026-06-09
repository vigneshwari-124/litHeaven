const Order = require('../../models/Order')

const salesReport = (req,res)=>{
    res.render('admin/salesReport')
}



const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, period, search } = req.query

    let filter = {}

    if (period === "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      filter.createdAt = { $gte: today, $lt: tomorrow }

    } else if (period === "yesterday") {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const today = new Date(yesterday)
      today.setDate(yesterday.getDate() + 1)
      filter.createdAt = { $gte: yesterday, $lt: today }

    } else if (period === "week") {
      const week = new Date()
      week.setDate(week.getDate() - 7)
      filter.createdAt = { $gte: week }

    } else if (period === "month") {
      const month = new Date()
      month.setMonth(month.getMonth() - 1)
      filter.createdAt = { $gte: month }

    } else if (period === "year") {
      const year = new Date()
      year.setFullYear(year.getFullYear() - 1)
      filter.createdAt = { $gte: year }

    } else if (startDate && endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filter.createdAt = { $gte: new Date(startDate), $lte: end }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 })

    const totalOrders = orders.length

    const totalRevenue = orders
      .filter(o => o.orderStatus === "Delivered")
      .reduce((acc, o) => acc + (o.totalAmount || 0), 0)

    const totalDiscount = orders
      .filter(o => o.orderStatus === "Delivered")
      .reduce((acc, o) => acc + (o.offerDiscount || 0) + (o.discount || 0), 0)

    const totalReturns = orders.filter(o =>
      o.orderStatus === "Returned" || o.orderStatus === "Cancelled"
    ).length

    let salesData = []

    orders.forEach(order => {
      order.items.forEach(item => {
        salesData.push({
          orderId:  order.orderId,
          date:     order.createdAt,
          customer: order.address?.fullName || "—",
          product:  item.name,
          quantity: item.quantity,
          amount:   item.total,
          payment:  order.paymentMethod,
          status:   item.status
        })
      })
    })

    if (search) {
      const value = search.toLowerCase()
      salesData = salesData.filter(item =>
        item.customer.toLowerCase().includes(value) ||
        String(item.orderId).toLowerCase().includes(value) ||
        item.product.toLowerCase().includes(value)
      )
    }

    res.json({
      success:       true,
      salesData,
      totalOrders,
      totalRevenue,
      totalDiscount,
      totalReturns
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
}

module.exports = {
    salesReport,
    getSalesReport
}