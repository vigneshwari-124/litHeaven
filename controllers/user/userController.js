const User = require('../../models/User')
const Otp  = require('../../models/Otp_temp')
const Product = require("../../models/Product")
const Offers=require('../../models/Offers')
const Review=require('../../models/Review')
const Wallet = require('../../models/Wallet');
const bcrypt=require('bcrypt')
const Category = require("../../models/Categories");
const sendOtpMail=require('../../utils/sendMail')
const generateReferralCode =require('../../utils/generateReferralCode');
const passport = require('passport')

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getSignup=(req,res)=>{
    res.render('user/signup',{error:null,success:null })
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const postSignup=async (req,res)=>{


  try{
    let {name,email,phone,password,confirmPassword,referralCode}=req.body;

    name = name.trim();
    email = email.trim();
    phone = phone.trim();

    if(!name){
      return res.status(400).json({
        success:false,
        message:"name is required"
      })
    }

    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

    if (!nameRegex.test(name)) {
    return res.status(400).json({
        success: false,
        message: "Only letters are allowed"
    });
    }

    if(!email){
      return res.status(400).json({
        success:false,
        message:"email is required"
      })
    }


    const emailRegex = /^[a-z0-9]+@[a-z0-9]+\.[a-z]{2,}$/;

   if (!emailRegex.test(email)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email format"
    });
   }


    if(!phone){
      return res.status(400).json({
        success:false,
        message:"phone number is required"
      })
    }
   

    const phoneRegex = /^[0-9]{10}$/;

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits"
    });
  }

  if (!password || password.trim() === "") {
    return res.status(400).json({
        success: false,
        message: "Password is required"
    });
}

  const passwordRegex =/^(?=.*[A-Z])(?=.*[@%*_\-$#^!])(?=.*[0-9])[A-Za-z0-9!@#$%^&*]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
        success: false,
        message: "Min 8 chars, 1 uppercase & 1 symbol required"
    });
  }


  if (!confirmPassword || confirmPassword.trim() === "") {
    return res.status(400).json({
        success: false,
        message: "Confirm password is required"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
        success: false,
        message: "Passwords do not match"
    });
  }

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
    let myReferralCode;
    let exists;

do {
  myReferralCode = generateReferralCode(name);
  

  exists = await User.findOne({
    referralCode: myReferralCode
  });

  
} while (exists);
    user=await User.create({
      name,
      email,
      phone,
      password:hashedPassword,
      isVerified:false,
      referralCode: myReferralCode
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


   req.session.referralCode = referralCode || null;

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

let email = "";

if (purpose === "profile-email") {
  email = req.session.pendingEmail;
} else {
  let user = await User.findById(req.session.otpUserId)
    .select("email")
    .lean();

  if (!user) {
    return res.redirect("/signup");
  }

  email = user.email;
}

res.render("user/otp", {
  email,
  otpExpiresAt: otpDoc.expiresAt.getTime()
});

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


    if (!userOtp || userOtp.trim() === "") {
  return res.status(400).json({
    success: false,
    message: "OTP is required"
  });
}

const otpRegex = /^[0-9]{6}$/;

if (!otpRegex.test(userOtp)) {
  return res.status(400).json({
    success: false,
    message: "Please enter a valid 6-digit OTP"
  });
}

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

  const referralCode = req.session.referralCode;


  if (referralCode) {

    const referrer = await User.findOne({
      referralCode: referralCode.trim().toUpperCase()
    });

    
  

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code"
      });
    }

    if (String(referrer._id) === String(user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot use your own referral code"
      });
    }

    if (user.referredBy) {
      return res.status(400).json({
        success: false,
        message: "Referral code already used"
      });
    }

    user.referredBy = referrer._id;

    let wallet = await Wallet.findOne({
      userId: referrer._id
    });

    if (!wallet) {

      wallet = new Wallet({
        userId: referrer._id,
        balance: 0,
        transactions: []
      });

    }

  const alreadyRewarded = wallet.transactions.find(
  t =>
    t.reason === "referral_bonus" &&
    t.transactionId === String(user._id)
);

if (!alreadyRewarded) {

  wallet.balance += 100;

  wallet.transactions.push({
    transactionId: String(user._id),
    type: "credit",
    amount: 100,
    reason: "referral_bonus"
  });

  await wallet.save();

  let newUserWallet = await Wallet.findOne({
  userId: user._id
});

if (!newUserWallet) {
  newUserWallet = new Wallet({
    userId: user._id,
    balance: 0,
    transactions: []
  });
}

const alreadyGotBonus = newUserWallet.transactions.find(
  t =>
    t.reason === "referral_bonus" &&
    t.transactionId === `REF-${referrer._id}`
);

if (!alreadyGotBonus) {

  newUserWallet.balance += 50;

  newUserWallet.transactions.push({
    transactionId: `REF-${referrer._id}`,
    type: "credit",
    amount: 50,
    reason: "referral_bonus"
  });

  await newUserWallet.save();
}

}

}

  user.isVerified = true;
  await user.save();

  delete req.session.referralCode;

  req.session.userId = user._id;
  req.session.isLoggedIn = true;

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

    let {email,password}=req.body

    email = email.trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

  
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[@%*_\-$#^!])[A-Za-z0-9!@#$%^&*]{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password is Min 8 chars, 1 uppercase & 1 symbol required"
      });
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

const now = new Date()

const offers = await Offers.find({
  isListed: true,
  startDate: { $lte: now },
  endDate: { $gte: now }
})
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
        o.type === "subcategory" &&
        String(o.subCategory) === String(p.subCategory._id) &&
        o.isListed
      )

      let categoryOffer = offers.find(o =>
        o.type === "category" &&
        String(o.category) === String(p.category._id) &&
        o.isListed
      )

     const offerList = []

if(productOffer){

  offerList.push(productOffer.discount)

}

if(subCategoryOffer){

  offerList.push(subCategoryOffer.discount)

}

if(categoryOffer){

  offerList.push(categoryOffer.discount)

}

let discount = 0

if(offerList.length > 0){

  discount = Math.max(...offerList)

}
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

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

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