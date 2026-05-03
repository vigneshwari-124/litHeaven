const mongoose=require("mongoose")

const couponSchema=new mongoose.Schema({

    code:{
        type:String,
        required:true,
        uppercase:true,
        unique:true
    },
    discountPct:{
        type:Number,
        required:true,
        min:1,
        max:100
    },
    minPurchase:{
        type:Number,
        required:true,
        min:0
    },
    maxDiscount:{
        type:Number,
        required:true,
        min:0
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active"
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})

module.exports=mongoose.model("Coupon",couponSchema)
