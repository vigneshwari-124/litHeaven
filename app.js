// console.log(Date.now())


// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     firstName: String,
//     secondName: String,
//     email: { type: String, unique: true },
//     phone: { type: String, unique: true, sparse: true },
//     password: String,
//     profile: String, 
//     googleId: { type: String, unique: true, sparse: true },
//     isBlocked: { type: Boolean, default: false },
//     referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//       referralCode: { type: String, unique: true, required: true ,sparse: true,},
//     isVerified: { type: Boolean, default: false },
//     loginType: {
//   type: String,
//   enum: ["manual", "google"],
//   default: "manual"
// }

//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);



// ///old logic 


// onst User = require('../../models/User')
// const Otp  = require('../../models/Otp_temp')

// const bcrypt=require('bcrypt')
// const sendOtpMail=require('../../utils/sendMail')

// const getSignup=(req,res)=>{
//     res.render('user/signup',{error:null,success:null })
// }

// const postSignup=async (req,res)=>{
//   try{
//     const {name,email,phone,password}=req.body;
//     const user=await User.findOne({email})
//     if(user && user.isVerified){
//         return res.status(400).json({
//           success:false,
//           message:"Email already registered. Please login"
//         })
//     }

//     const phoneUser=await User.findOne({phone})

//     if(phoneUser && phoneUser.isVerified){
//       return res.status(400).json({
//         success:false,
//         message:"Phone number already registered"
//       })

//     }
    
//    if(user && !userser.isVerified){
//     user.name=name;
//     user.phone=phone;
//     user.password=await bcrypt.hash(password,10)
//     const otp=Math.floor(100000 + Math.random()*900000).toString();
//     const expiresAt=new Date(Date.now()+60*1000)

    
//     user.otp=otp
//     user.otpExpiresAt=otpExpiresAt
//     await existingUser.save()
   
//     await sendOtpMail(email,otp)
//     req.session.otpEmail=email
//      return res.status(200).json({
//       success:true,
//       redirect:'/otp'
//      })
//    }

//    const hashedPassword= await bcrypt.hash(password,10)
//    const otp=Math.floor(100000+Math.random()*900000).toString()
//    console.log('signup',otp)
//    const otpExpiresAt=new Date(Date.now()+60*1000)
//     await User.create({
//         name,
//         email,
//         phone,
//         password:hashedPassword,
//         otp,
//         otpExpiresAt,
//         isVerified:false
        
//     })
//     await sendOtpMail(email,otp)
//     req.session.otpEmail=email
//     res.status(200).json({
//       success:true,
//       redirect:'/otp'
//     })

//   }catch(err){
//     console.log(err)
//     res.status(500).json({
//       success:false,
//       message:"Something went wrong"
//     })
//   }
// }


// const getOtp=async(req,res)=>{
//   if(!req.session.otpEmail){
//     return res.redirect('/signup')
//   }

//   let user=await User.findOne({email:req.session.otpEmail}).select('email otpExpiresAt').lean()

//   if(!user || !user.otpExpiresAt){
//     return res.redirect('/signup')
//   }
  
//   res.render('user/otp',{
//     email:req.session.otpEmail,
//     otpExpiresAt:user.otpExpiresAt.getTime()
//   })
// }

// const postOtp=async(req,res)=>{
//   try{
//    if(!req.session.otpEmail) {
//     return res.status(401).json({
//       success:false,
//       message:"Session expired. Please signup again",
//       redirect:"/signup"
//     })
//    }
//     const otp=req.body.otp
//     const email=req.session.otpEmail
//     const userOtp=Array.isArray(otp) ? otp.join(""):otp;
//     const user=await User.findOne({email})

//     if(!user){
//       return res.status(404).json({
//         success:false,
//         message:"User not found",
//         redirect:'/signup'
//       })
//     }

//     if(user.otpExpiresAt<new Date()){
//       return res.status(400).json({
//         success:false,
//         message:"OTP expired. Please resend Otp"
//       })
//     }

//     if(user.otp!==userOtp){
//       return res.status(400).json({
//         success:false,
//         message:"Invalid OTP"
//       })
//     }

//     user.isVerified=true
//     user.otp=null
//     user.otpExpiresAt=null
//     console.log("new user",user)
//     await user.save()
   
//     req.session.userId=user._id
//     req.session.isLoggedIn=true

//     delete req.session.otpEmail;
//     delete req.session.otpExpiresAt;

//   req.session.save(() => {
//   return res.status(200).json({
//     success: true,
//     message: "OTP verified successfully",
//     redirect: "/"
//   });
// });


//   }catch(err){
//     console.log(err)
//     return res.status(500).json({
//       success:false,
//       error:"Something went wrong"
//     })
//   }
// }

// const resendOtp=async(req,res)=>{
//   try{
//     if(!req.session.otpEmail){
//       return res.status(401).json({
//         message:"Session expired"})
//     }
//     const email=req.session.otpEmail
//     const user=await User.findOne({email})

//     if(!user){
//       return res.status(404).json({message:"User not found"})
//     }

//     if(user.otpExpiresAt>new Date()){
//       return res.status(400).json({
//         success: false,
//         message: "OTP already sent. Please wait"
        
//       })
//     }

//     const otp=Math.floor(100000+Math.random()*900000).toString();
//     console.log('resend',otp)
//     const otpExpiresAt=new Date(Date.now()+60*1000)
//     user.otp=otp
//     user.otpExpiresAt=otpExpiresAt;
//     await user.save()

//    await sendOtpMail(email,otp)
//     return res.json({
//       success:true,
//       message:"OTP resent",
//       otpExpiresAt:otpExpiresAt.getTime()
//     });

//   }catch(err){
//     console.log(err)
//     return res.status(500).json({message:"Something went wrong"})

//   }
// }




// const getLogin=(req,res)=>{

//   res.render('user/login')
// }

// const postLogin=async(req,res)=>{
//   try{

//     const {email,password}=req.body
//    console.log('old user',req.body)
//     if(!email || !password){
//       return res.status(400).json({
//            message:"All fields are required"
//       })
//     }

//     const user=await User.findOne({email})

//     if(!user){
//       res.status(404).json({
        
//         message:"Invalid email "
//       })
//     }

//     if (!user.isVerified) {
//       return res.status(403).json({
//         success: false,
//         message: "Please verify your email before login"
//       });
//     }
    
//     const isMatch=await bcrypt.compare(password,user.password)

//     if(!isMatch){
//       return res.status(404).json({
//         success:false,
//         message:"Invalid  password"
//       })
//     }

//     req.session.userId=user._id
//     req.session.isLoggedIn=true

//     res.status(200).json({
//       success:true,
//       redirect:'/'
//     })

//   }catch(err){
//     console.log(err)
//     return res.status(500).json({
//       message:"Server error"
//     })
//   }
// }

// const getHome=(req,res)=>{ 
//   res.render('user/home') 
// }

// const getForgot=(req,res)=>{
//   res.render('user/forgot')
// }

// const postForgot=async(req,res)=>{
//   try{
//     const {email}=req.body

//     const user=await User.findOne({email})

//     if(!user){
//       return res.status(404).json({
//         success:false,
//         message:"Invalid Email"
//       })
//     }

//     if(user){
//       const opt=Math.floor(100000+Math.random()*900000).toString()
      
//     }

//   }catch(err){
//     console.log(err)
//     return res.status(500).json({
//       message:"Server error"
//     })
//   }

// }
// module.exports={
//     getSignup,
//     postSignup,  
//     getOtp,
//     postOtp,
//     getHome,
//     resendOtp,
//     getLogin,
//     postLogin,
//     getForgot,
//     postForgot
// }


// const getForgotOtp=async (req,res)=>{
//        if(!req.session.forgotUserId){
//         return res.redirect('/forgot-password')

//        }

//     const user = await User.findById(req.session.forgotUserId);
    
//      const otpDoc=await Otp.findOne({
//       userId:req.session.forgotUserId,
//       purpose:"forgot",
//       isUsed:false,
//       expiresAt:{$gt: new Date()}
//      }).sort({createdAt:-1}).lean()

//      if(!otpDoc) return res.redirect('/forgot-password')


//      res.render('user/otp',{
//      email:user.email,
//      otpExpiresAt:otpDoc.expiresAt.getTime()
//   })
// }

// ////////////////////////////////////////////////////////

// const postForgotOtp=async(req,res)=>{
// try{
//   if(!req.session.forgotUserId){
//        return res.status(401).json({
//         success:false,
//         message:"Session expired"
//        })
//   }
//   const otp=req.body.otp
//   const userOtp = Array.isArray(otp) ? otp.join("") : otp

  
//   const otpDoc=await Otp.findOne({
//     userId:req.session.forgotUserId,
//     purpose:"forgot",
//     isUsed:false,
//     expiresAt:{$gt:new Date()}
//   }).sort({createdAt:-1})

//   if(!otpDoc){
//     return res.status(400).json({
//       success:false,
//       message:"OTP expired "
//     })
//   }

//   if(otpDoc.otp !==userOtp){
//     return res.status(400).json({
//       success:false,
//       message:"Invalid OTP"
//     })
//   }

//   otpDoc.isUsed=true;
//   await otpDoc.save()

//   if(otpDoc.purpose==="forgot"){
//   req.session.allowPasswordReset=true;
//   res.json({
//     success:true,
//     redirect:'/reset-password'
//   })
//   }
  

// }catch(err){
//   console.log(err)
//   res.status(500).json({
//     success:false,
//     message:"Something went error"
//   })
// }
// }

/////////////////////////////////////////////////////////