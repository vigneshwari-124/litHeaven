const User=require('../../models/User')
const Otp=require('../../models/Otp_temp')
const sendOtpMail=require('../../utils/sendMail')
const cloudinary=require('../../config/cloudinary')
const Address=require('../../models/Address')
const bcrypt=require('bcrypt')

const getProfile=async(req,res)=>{
  try{
    let userId=req.session.userId;
   
    const user=await User.findById(userId)

    const primaryAddress = await Address.findOne({
      userId,
      isPrimary: true
    });

    res.render('user/profile',{
        user:user,
        primaryAddress,
        isGoogleUser:!user.password
    })
  }catch(err){
    console.log(err)
    res.status(500).send('Something went wrong');
  }
  
}

//////////////////////////////////////////////////////////////

const editProfile=async(req,res)=>{
  try{
    const userId=req.session.userId
    const {name,phone}=req.body

     const existingUser = await User.findOne({
      phone: phone,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.redirect('/profile?error=phone-exists');
    }

    await User.findByIdAndUpdate(userId,{
        name,
        phone
      }
    )

     return res.redirect('/profile?success=updated');


  }catch(err){
     console.log(err)
  }
}

/////////////////////////////////////////////////////////////


const getChangeEmail=(req,res)=>{
 try {
    const userId = req.session.userId;

    if (!userId) {
      return res.redirect('/login');
    }

    res.render('user/changeEmail'); 
  } catch (err) {
    console.log(err);
  }
}

/////////////////////////////////////////////////////////////

const postChangeEmil=async(req,res)=>{
  try{
    const {email}=req.body
    const userId=req.session.userId
    if(!userId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized"
      })
    }

    const exists=await User.findOne({email})

    if(exists){
      return res.status(400).json({
        success:false,
        message:"Email already exists"
      })
    }

    const existingOtp = await Otp.findOne({
      userId,
      purpose: "profile-email",
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

     if (existingOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP already sent. Please wait 1 minutes"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("changeEmail OTP:", otp);

   await sendOtpMail(email, otp);


    await Otp.create({
      userId,
      otp,
      purpose: "profile-email",
      isUsed: false,
      expiresAt: new Date(Date.now() + 60 * 1000)
    });

    req.session.pendingEmail = email;
    req.session.otpPurpose = "profile-email";
    req.session.otpUserId = userId;

    return res.json({
      success: true,
      redirect: "/otp"
    });


  }catch(err){
     console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });

  }
}

////////////////////////////////////////////////////////////

const uploadProfileImg=async(req,res)=>{
 try{
   if (!req.file) {
      return res.status(400).json({ success: false })
    }

    const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

if (!allowedMimeTypes.includes(req.file.mimetype)) {

  return res.status(400).json({
    success: false,
    message: "Only image files are allowed"
  });
}

  const user = await User.findById(req.session.userId)

    if (user.profileImage?.publicId) {
      await cloudinary.uploader.destroy(user.profileImage.publicId)
    }

  const result=await cloudinary.uploader.upload(req.file.path,{
    folder: "profile_images",
    transformation: [
    { width: 300, height: 300, crop: "fill" },
    { quality: "auto", fetch_format: "auto" }
  ]
  })

  
    user.profileImage={
        url: result.secure_url,
        publicId: result.public_id
    }

    await user.save()
  

  res.json({
    success:true,
    imageUrl:result.secure_url
  })

 }catch(err){
  console.log(err)
  res.status(500).json({ success: false,
    message:"Something went wrong"
   })
 }
}

////////////////////////////////////////////////////////////

const deleteProfileImg = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)

    if (!user.profileImage?.publicId) {
      return res.json({ success: true })
    }

    
    await cloudinary.uploader.destroy(user.profileImage.publicId)

    
    user.profileImage = undefined
    await user.save()

    res.json({ success: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false })
  }
}


////////////////////////////////////////////////////////////

const changePassword=async (req,res)=>{
  try{
    const userId=req.session.userId

    const {currentPassword,newPassword}=req.body

    const user=await User.findById(userId)

    if(!user){
      return res.status(404).json({success:false,
        message:"User not found"
      })
    }

    if (!user.password) {
  return res.status(403).json({
    success: false,
    message: "You logged in using Google. Password change is not allowed."
  });
}

const isMatch=await bcrypt.compare(
  currentPassword,user.password
)

if(!isMatch){
  return res.status(400).json({
    success:false,
    message:"Current password is incorrect"
  })
}

const isSame=await bcrypt.compare(newPassword,user.password)
if(isSame){
  return res.status(400).json({
    success:false,
    message:"New password must be diffrent from old password"
  })
}

const hashedPassword=await bcrypt.hash(newPassword,10)
user.password=hashedPassword;

await user.save()

return res.status(200).json({
  success:true,
  message:"Password changed successfully"
})


  }catch(err){
    console.log(err)
    return res.status(500).json({
      success:false,
      message:"Server error"
    })

  }
}


////////////////////////////////////////////////////////////
module.exports={
    getProfile,
    editProfile,
    getChangeEmail,
    postChangeEmil,
    uploadProfileImg,
    deleteProfileImg,
    changePassword

}