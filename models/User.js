const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
    name: String,
    email:{
        type:String,
        unique:true,
        lowercase:true
    },
    phone:{
        type:String
       
    },
    password:{
        type:String
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    profileImage: {
         url: String,
         publicId: String
    },
    isVerified:{
        type:Boolean,
        default:false
    },
     primaryAddressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    default: null
    },
  googleId: {
  type: String,
  unique: true,
  sparse: true
 },
  authProvider: {
  type: String,
  enum: ["local", "google"],
  default: "local"
 },

    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },

    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }

   
},{timestamps:true})

const User=mongoose.model("User",userSchema)
module.exports=User;

