const User = require('../../models/User')
const Otp  = require('../../models/Otp_temp')
const Product = require("../../models/Product")
const Offers=require('../../models/Offers')
const Review=require('../../models/Review')
const bcrypt=require('bcrypt')
const Category = require("../../models/Categories");
const sendOtpMail=require('../../utils/sendMail')
const passport = require('passport')

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getSignup=(req,res)=>{
    res.render('user/signup',{error:null,success:null })
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postSignup=async (req,res)=>{
  try{
    const {name,email,phone,password}=req.body;
    let user=await User.findOne({email})
    if(user && user.isVerified){
        return res.status(400).json({
          success:false,
          message:"Email already registered. Please login"
        })
    }

    const phoneUser=await User.findOne({phone})

    if(phoneUser && phoneUser.isVerified){
      return res.status(400).json({
        success:false,
        message:"Phone number already registered"
      })

    }
    
   if(!user){
    const hashedPassword=await bcrypt.hash(password,10)
    user=await User.create({
      name,
      email,
      phone,
      password:hashedPassword,
      isVerified:false
    })
   }else{
    user.name=name;
    user.phone=phone;
    user.password=await bcrypt.hash(password,10)
    await user.save()
   }

   const otp=Math.floor(100000+Math.random()*900000).toString()
   console.log("sendOtp",otp)

   try {
      await sendOtpMail(user.email, otp);
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again or contact support."
      });
    }

   await Otp.create({
    userId:user._id,
    otp,
    purpose:"signup",
    expiresAt:new Date(Date.now()+60*1000)
   })


    req.session.otpUserId=user._id
    req.session.otpPurpose = 'signup';  

    res.status(200).json({
      success:true,
      redirect:'/otp'
    })

  }catch(err){
    console.log(err)
    res.status(500).json({
      success:false,
      message:"Something went wrong"
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getOtp=async(req,res)=>{
  if(!req.session.otpUserId){
    return res.redirect('/signup')
  }
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  const purpose=req.session.otpPurpose || "signup" ;

  let user=await User.findById(req.session.otpUserId).select('email').lean()

  if(!user){
    return res.redirect('/signup')
  }

  const otpDoc=await Otp.findOne({
    userId:req.session.otpUserId,
    purpose:purpose,
    isUsed:false,
    expiresAt:{$gt:new Date()}
  }).sort({createdAt:-1}).lean()

  if(!otpDoc){
    const redirectMap={
      signup:'/signup',
      forgot:'/forgot-password'
     
    };
    return res.redirect(redirectMap[purpose] || '/signup')
  }


  
  res.render('user/otp',{
    email:user.email,
    otpExpiresAt:otpDoc.expiresAt.getTime()
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postOtp = async (req, res) => {
  try {
    if (!req.session.otpUserId || !req.session.otpPurpose) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please signup again",
        redirect: "/signup"
      })
    }

    const otp = req.body.otp
    const purpose = req.session.otpPurpose ;
    const userOtp = Array.isArray(otp) ? otp.join("") : otp
    const user = await User.findById(req.session.otpUserId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        redirect: "/signup"
      })
    }

    const otpDoc = await Otp.findOne({
      userId: user._id,
      otp: userOtp,
      purpose: purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 })

    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      })
    }

    otpDoc.isUsed = true;
    await otpDoc.save();

    let redirectUrl = '/';
    let successMessage = 'OTP verified successfully';

    if (otpDoc.purpose === "signup") {

      user.isVerified = true
      await user.save()

      req.session.userId = user._id
      req.session.isLoggedIn = true
      
      redirectUrl = '/';
      successMessage = 'Account verified successfully!';
  
    }else if (purpose === 'forgot') {
      req.session.allowPasswordReset = true;
      redirectUrl = '/reset-password';
      successMessage = 'OTP verified! Set your new password';
    }else if (purpose === "profile-email") {
      user.email = req.session.pendingEmail;
      await user.save();

      delete req.session.pendingEmail;

      redirectUrl = '/profile';
      successMessage = 'Email updated successfully';
    }


     delete req.session.otpPurpose;
     
    if (purpose !== "forgot") {
        delete req.session.otpUserId;
     }
    req.session.save(() => {
        return res.status(200).json({
          success: true,
          message: successMessage,
          redirect: redirectUrl
        })
      })

  } catch (err) {
    console.log(err)
    return res.status(500).json({
      success: false,
      error: "Something went wrong"
    })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const resendOtp=async(req,res)=>{
  try{
    if(!req.session.otpUserId){
      return res.status(401).json({
        message:"Session expired. Session expired. Please signup again",
        redirect: "/signup"

      })
    }

    const purpose = req.session.otpPurpose || 'signup'; 
    
    const user=await User.findById(req.session.otpUserId).select('email')

    if(!user){
      return res.status(404).json({message:"User not found"})
    }

    const existingOtp = await Otp.findOne({
      userId: user._id,
      purpose: purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    })

     if (existingOtp) {
      return res.status(400).json({
        message: "OTP already sent. Please wait"
      })
    }


    const otp=Math.floor(100000+Math.random()*900000).toString();
    console.log('resend',otp, 'Purpose:',purpose)
    const otpExpiresAt=new Date(Date.now()+60*1000)
    
    const otpDoc = await Otp.create({
      userId: user._id,
      otp,
      purpose:purpose,
      expiresAt: otpExpiresAt
    })
   

   await sendOtpMail(user.email,otp)
    return res.json({
      success:true,
      message:"OTP resent",
      otpExpiresAt:otpDoc.expiresAt.getTime()
    });

  }catch(err){
    console.log(err)
    return res.status(500).json({message:"Something went wrong"})

  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getLogin=(req,res)=>{

  res.render('user/login')
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postLogin=async(req,res)=>{
  try{

    const {email,password}=req.body
   console.log('old user',req.body)

    if(!email || !password){
      return res.status(400).json({
           message:"All fields are required"
      })
    }

    const user=await User.findOne({email})

    if(!user){
      return res.status(404).json({
        success:false,
        message:"Invalid email "
      })
    }

     if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        redirect: "/blocked"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login"
      });
    }
    
    const isMatch=await bcrypt.compare(password,user.password)

    if(!isMatch){
      return res.status(404).json({
        success:false,
        message:"Invalid  password"
      })
    }

req.session.userId = user._id
req.session.isLoggedIn = true

req.session.save((err) => {
  if (err) {
    console.log("Session save error:", err)
    return res.status(500).json({ message: "Session error" })
  }

  return res.json({
    success: true,
    redirect: '/'
  })
})

  }catch(err){
    console.log(err)
    return res.status(500).json({
      message:"Server error"
    })
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const getHome = async (req, res) => {
  try {

    const products = await Product.find({ isDeleted: false })
  .populate({
    path: "author",
    match: { isDeleted: false }
  })
  .populate({
    path: "category",
    match: { isDeleted: false }
  })
  .populate({
    path: "subCategory",
    match: { isDeleted: false }
  })
  .sort({ createdAt: -1 });

  const offers = await Offers.find({isListed: true});

const bestSellers = await Promise.all(
  products
    .filter(p => p.author && p.category && p.subCategory)
    .slice(0,6)
    .map(async (p) => {

      const reviews = await Review.find({ product: p._id })

      let totalReviews = reviews.length
      let avgRating = 0

      if(totalReviews > 0){
        const total = reviews.reduce((sum, r) => sum + r.rating, 0)
        avgRating = total / totalReviews
      }

      let totalStock = 0
      p.variants.forEach(v => {
        v.formats.forEach(f => {
          totalStock += f.stock
        })
      })

      let productOffer = offers.find(o =>
        o.type === "product" &&
        String(o.product) === String(p._id) &&
        o.isListed
      )

      let subCategoryOffer = offers.find(o =>
        o.type === "subCategory" &&
        String(o.subCategory) === String(p.subCategory._id) &&
        o.isListed
      )

      let categoryOffer = offers.find(o =>
        o.type === "category" &&
        String(o.category) === String(p.category._id) &&
        o.isListed
      )

      let finalOffer = productOffer || subCategoryOffer || categoryOffer
      let discount = finalOffer ? finalOffer.discount : 0
      let basePrice = p.variants[0]?.formats[0]?.price || 0
      let offerPrice = basePrice - (basePrice * discount / 100)

      return {
        ...p.toObject(),
        isOutOfStock: totalStock === 0,
        discount,
        originalPrice: basePrice,
        offerPrice: Math.round(offerPrice),
        avgRating,
        totalReviews
      }

    })
)
    const featuredCategories = await Category.find({
      isFeatured: true,
      isDeleted: false,
      parentCategory: { $ne: null }
     }).populate({
      path: "parentCategory",
     match: { isDeleted: false }
    });

    const validFeaturedCategories = featuredCategories.filter(
       c => c.parentCategory
    );
    res.render("user/home", {
      bestSellers,
      featuredCategories: validFeaturedCategories,
      isLoggedIn: req.session.isLoggedIn || false,
      userId: req.session.userId || null
    });

  } catch (err) {
    console.log(err);
  }
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getForgot=(req,res)=>{
  res.render('user/forgot')
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postForgot=async(req,res)=>{
  try{
    const {email}=req.body

    const user=await User.findOne({email})

    if(!user){
      return res.status(404).json({
        success:false,
        message:"Invalid Email"
      })
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your account before resetting password"
      });
    }

    if (!user.password) {
      return res.status(403).json({
        success: false,
        message: "This account uses Google login. Please login with Google."
      });
    }

    const existingOtp = await Otp.findOne({
      userId: user._id,
      purpose: "forgot",
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (existingOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP already sent. Please wait 1 minutes"
      });
    }

    const otp=Math.floor(100000+Math.random()*900000).toString()
    console.log("forgotPass",otp)

    try {
      await sendOtpMail(user.email, otp);
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again later."
      });
    }

    await Otp.create({
      userId:user._id,
      otp,
      purpose:"forgot",
      isUsed:false,
      expiresAt:new Date(Date.now()+60*1000)
    })

  

   req.session.otpUserId = user._id;
    req.session.otpPurpose = 'forgot';

    res.json({
      success:true,
      redirect:'/otp'
    })

  }catch(err){
    console.log(err)
    return res.status(500).json({
      message:"Something went wrong"
    })
  }

}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getResetPass=async (req,res)=>{
   if (!req.session.allowPasswordReset) {
    return res.redirect('/forgot-password');
  }
  const user = await User.findById(req.session.otpUserId);
   
  if (!user || !user.password) {
    return res.redirect('/login');
  }

  res.render('user/resetPage')
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postRestPass=async(req,res)=>{
  try{
    if(!req.session.allowPasswordReset || !req.session.otpUserId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized access. Please verify OTP again"
      })
    }

    const {password}=req.body

    if(!password){
      return res.status(400).json({
        success:false,
        message:"Password is required"
      })
    }

    const user=await User.findById(req.session.otpUserId)

    if(!user){
      return res.status(404).json({
        success:false,
        message:"User not Found"
      })
    }

    const isSamePass=await bcrypt.compare(password,user.password)

    if(isSamePass){
      return res.status(400).json({
        success:false,
        message:"New password cannot be same as old password"
      })
    }

    const hashedPassword=await bcrypt.hash(password,10)
    user.password=hashedPassword;
    await user.save();

    delete req.session.allowPasswordReset;
    delete req.session.otpUserId;
    delete req.session.otpPurpose;

    return res.status(200).json({
      success:true,
      message:"Password reset successful. Please login",
      redirect:"/login"
    })

  }catch(err){
   console.log(err)
   return res.status(500).json({
    success:false,
    message:"Something went wrong"
   })
  }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const googleAuthCallback=(req,res,next)=>{
  passport.authenticate('google',(err,user,info)=>{
    if(err){
      console.log("Google Auth Error:",err)
      return res.redirect('/login?toast=Something went wrong')
    }

    if(!user){
      
      if (info?.message === "BLOCKED") {
      return res.redirect("/blocked");
      }

      const msg=info?.message || "Google login failed";
      return res.redirect(`/login?toast=${encodeURIComponent(msg)}`)
    }

     if (user.isBlocked) {
      return res.redirect('/blocked');
    }


    req.logIn(user,(err)=>{
      if(err){
        console.error("Login session error:", err)
        return res.redirect("/login?toast=Login failed")
      }
       req.session.userId = user._id;
      req.session.isLoggedIn = true;

      return res.redirect("/");
    })
  })(req,res,next)
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const clearOtpSession = async (req, res) => {
  try {
    if (req.session.otpUserId && req.session.otpPurpose) {
      await Otp.updateMany(
        {
          userId: req.session.otpUserId,
          purpose: req.session.otpPurpose,
           isUsed: false,
          expiresAt: { $gt: new Date() }
        },
        { $set: { isUsed: true } }
      );
    }

    delete req.session.otpUserId;
    delete req.session.otpPurpose;
    delete req.session.allowPasswordReset;
    delete req.session.pendingEmail;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
    getSignup,
    postSignup,  
    getOtp,
    postOtp,
    getHome,
    resendOtp,
    getLogin,
    postLogin,
    getForgot,
    postForgot,
    getResetPass,
    postRestPass,
    logout,
    googleAuthCallback,
    clearOtpSession
    
}