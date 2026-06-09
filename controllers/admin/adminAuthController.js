const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Address=require('../../models/Address')
const Order=require('../../models/Order')
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getLogin=(req,res)=>{
    
    if(req.session.isAdmin){
        return res.redirect('/admin/dashboard')
    }
    res.render('admin/login')

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postAdminLogin=async(req,res)=>{
   try{
    const {email,password}=req.body

    if(req.session.isAdmin){
       return res.status(200).json({
        success:true,
        redirect:"/admin/dashboard"
       })
    }

    if(email!==process.env.ADMIN_EMAIL){
        return res.status(400).json({
            success:false,
            message:"Invalid admin credentials email"
        })
    }

    const isMatch= await bcrypt.compare(
        password,
        process.env.ADMIN_PASSWORD_HASH
    )

    if(!isMatch){
        return res.status(400).json({
            success:false,
            message:"Invalid admin credentail password"
        })
    }

    req.session.isAdmin = true;

req.session.save((err) => {
  if (err) {
    return res.status(500).json({
      success:false,
      message:"Session error"
    })
  }

  return res.status(200).json({
    success:true,
    redirect:"/admin/dashboard"
  })
})
}catch(err){
    console.log(err)
    res.status(500).json({
        success:false,
        message:"Server error"
    })
}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const adminDashboard=(req,res)=>{
    res.render('admin/dashboard')
}


const getChartData = async (req, res) => {
  try {
    const filter = req.query.filter || 'today'
    const now = new Date()
    let startDate, endDate

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    } else if (filter === 'yesterday') {
      const y = new Date(now)
      y.setDate(now.getDate() - 1)
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0)
      endDate   = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59)

    } else if (filter === 'last7days') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0,0,0,0)
      endDate   = new Date(now); endDate.setHours(23,59,59,999)

    } else if (filter === 'last30days') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 29); startDate.setHours(0,0,0,0)
      endDate   = new Date(now); endDate.setHours(23,59,59,999)

    } else if (filter === 'thismonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    } else if (filter === 'lastmonth') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    } else if (filter === 'lastyear') {
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
    }

const orders = await Order.aggregate([
  {
    $match: {
      createdAt: { $gte: startDate, $lte: endDate },
      orderStatus: "Delivered"
    }
  },
  {
    $project: {
      createdAt: 1,
      netAmount: "$totalAmount"  
    }
  }
])
    console.log("Orders found:", orders) 
  
    const { labels, values } = buildChartData(filter, orders, startDate, endDate, now)

    const totalEarning = values.reduce((a, b) => a + b, 0)

    res.json({ success: true, labels, values, totalEarning })

  } catch (err) {
    console.log(err)
    res.json({ success: false })
  }
}


function buildChartData(filter, orders, startDate, endDate, now) {
  let labels = []
  let values = []

  if (filter === 'today' || filter === 'yesterday') {
  
    labels = Array.from({length: 24}, (_, i) => `${i}:00`)
    values = Array(24).fill(0)
    orders.forEach(o => {
      const hour = new Date(o.createdAt).getHours()
      values[hour] += o.netAmount|| 0
    })

  } else if (filter === 'last7days') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }))
      values.push(0)
    }
    orders.forEach(o => {
      const orderDate = new Date(o.createdAt)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i)
        if (orderDate.toDateString() === d.toDateString()) {
          values[6 - i] += o.netAmount || 0
        }
      }
    })

  } else if (filter === 'last30days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i)
      labels.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }))
      values.push(0)
    }
    orders.forEach(o => {
      const orderDate = new Date(o.createdAt)
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i)
        if (orderDate.toDateString() === d.toDateString()) {
          values[29 - i] += o.netAmount || 0
        }
      }
    })

  } else if (filter === 'thismonth' || filter === 'lastmonth') {
    const totalDays = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
    labels = Array.from({length: totalDays}, (_, i) => `${i + 1}`)
    values = Array(totalDays).fill(0)
    orders.forEach(o => {
      const day = new Date(o.createdAt).getDate()
      values[day - 1] += o.netAmount || 0
    })

  } else if (filter === 'lastyear') {
    labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    values = Array(12).fill(0)
    orders.forEach(o => {
      const month = new Date(o.createdAt).getMonth()
      values[month] += o.netAmount || 0
    })
  }

  return { labels, values }
}

const getDashboardStats = async (req, res) => {
  try {

    const orderStatusCounts = await Order.aggregate([
      {
        $unwind: '$items' 
      },
      {
        $group: {
          _id: '$items.status',  
          count: { $sum: 1 }
        }
      }
    ])

    const statusMap = {
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Returned: 0
    }

    orderStatusCounts.forEach(s => {
      if (statusMap.hasOwnProperty(s._id)) {
        statusMap[s._id] = s.count
      }
    })

    res.json({ success: true, statusMap })

  } catch (err) {
    console.log(err)
    res.json({ success: false })
  }
}


const getTopProducts= async (req,res)=>{

  try {

    const topProducts = await Order.aggregate([

      { $unwind:"$items" },

      {
        $group:{

          _id:"$items.productId",

          productName:{ $first:"$items.name" },

          image:{ $first:"$items.image" },

          price:{ $first:"$items.price" },

          variant:{ $first:"$items.format" },

          totalSold:{
            $sum:"$items.quantity"
          }

        }
      },

      { $sort:{ totalSold:-1 } },

      { $limit:5 }

    ])


    const topSubcategories = await Order.aggregate([

  {
    $unwind:"$items"
  },

  {
    $lookup:{
      from:"products",
      localField:"items.productId",
      foreignField:"_id",
      as:"product"
    }
  },

  {
    $unwind:"$product"
  },

  {
    $lookup:{
      from:"categories",
      localField:"product.subCategory",
      foreignField:"_id",
      as:"subcategory"
    }
  },

  {
    $unwind:"$subcategory"
  },

  {
    $match:{
      "subcategory.parentCategory":{
        $ne:null
      }
    }
  },

  {
    $group:{

  _id:"$subcategory._id",

  subcategoryName:{
    $first:"$subcategory.name"
  },

  subcategoryImage:{
    $first:"$subcategory.image.url"
  },

  totalSold:{
    $sum:"$items.quantity"
  }

}
  },

  {
    $sort:{
      totalSold:-1
    }
  },

  {
    $limit:5
  }

])
    res.json({
      success:true,
      topProducts,
      topSubcategories
    })

  } catch (error) {

    console.log(error)

    res.json({
      success:false
    })

  }

}

const getDashboardCards = async (req, res) => {
  try {

    const totalOrders = await Order.countDocuments()

    const totalUsers = await User.countDocuments()

    const earningResult = await Order.aggregate([
      { $match: { orderStatus: 'Delivered' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
    const totalEarning = earningResult[0]?.total || 0

  
const salesResult = await Order.aggregate([
  { 
    $match: { 
      orderStatus: { $nin: ['Cancelled', 'Returned'] } 
    } 
  },
  { $group: { _id: null, total: { $sum: '$totalAmount' } } }
])
const totalSales = salesResult[0]?.total || 0

    res.json({
      success: true,
      totalOrders,
      totalUsers,
      totalEarning,
      totalSales
    })

  } catch (err) {
    console.log(err)
    res.json({ success: false })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getCustomer= async(req,res)=>{
    try{
       const page=Number(req.query.page)||1
       const limit=7
       const skip=(page-1)*limit

       const totalUsers=await User.countDocuments()
      const users=await User.find({})
      .sort({createdAt:-1})
      .skip(skip)
      .limit(limit)


        res.render('admin/customer',{
            users,
            warning:null,
            currentPage:page,
            totalPages:Math.ceil(totalUsers/limit)
           
        })

    }catch(err){
    console.log(err)
    res.render('admin/customer', {
      users: [],
      warning: "Data temporarily unavailable",
      currentPage: 1,
      totalPages: 1
    })
    }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const toggleBlockUser=async(req,res)=>{
    try{
        const userId=req.params.id

        const user=await User.findById(userId)

        if(!user){
           return res.status(404).json({
           success: false,
           message: "User not found"
      })
        }

        user.isBlocked=!user.isBlocked
        await user.save()

       return res.status(200).json({
       success: true,
       isBlocked: user.isBlocked
       })

    }catch(err){
        console.log(err)
       res.status(500).json({
         success: false,
         message: "Server error"
       })
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const searchCustomers = async (req, res) => {
  try {
   const { query = '', status = 'all' } = req.query
    let page=Number(req.query.page)||1
    const LIMIT = Number(req.query.limit) || 7
    let skip=(page-1)*LIMIT

    let filter = {}

if (query) {
if (!isNaN(query)) {
    filter = { phone: Number(query) }
}else {
    filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }
  }
}


  if (status === 'blocked') filter.isBlocked = true
  if (status === 'active') filter.isBlocked = false
  

   const total = await User.countDocuments(filter)
  
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(LIMIT)


    
    res.status(200).json({
      success: true,
      users,
      currentPage:page,
      totalPages:Math.ceil(total/LIMIT),
      total
    })
   
    

  } catch (err) {
    console.log(err)
    res.status(500).json({ 
      success: false,
      message: 'Search failed'
     })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const logout = (req, res) => {
  try {
    req.session.isAdmin = null
    req.session.destroy(err => {
      if (err) {
        console.log(err)
        return res.status(500).json({
          message: "Logout failed"
        })
      }
      res.clearCookie('connect.sid')
      res.status(200).json({
        redirect: "/admin/login"
      })
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Server error"
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getCustomerById=async(req,res)=>{
  try{
    const userId=req.params.id
    const user=await User.findById(req.params.id).lean()

    if(!user){
      return res.status(404).json({
        success:false,
        message:"User not found"
      })
    }

    const address=await Address.findOne({userId,isPrimary:true}) || 
    await Address.findOne({userId})

    res.status(200).json({
      success:true,
      user,
      hasAddress :!!address,
      address:address || null
      })

  }catch(err){
    console.log(err)
    res.status(500).json({success:false})
  }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports={
    getLogin,
    postAdminLogin,
    adminDashboard,
    getChartData,
    getDashboardStats,
    getTopProducts,
    getDashboardCards ,
    getCustomer,
    toggleBlockUser,
    searchCustomers,
    getCustomerById,
    logout
}