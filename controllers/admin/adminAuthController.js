const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Address=require('../../models/Address')


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
    getCustomer,
    toggleBlockUser,
    searchCustomers,
    getCustomerById,
    logout
}