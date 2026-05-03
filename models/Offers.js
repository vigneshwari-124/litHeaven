const mongoose=require('mongoose')

const offerSchema=new mongoose.Schema({
    offerName:{
        type:String,
        required:true
    },
    discount:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        enum:["category","subcategory","product"],
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category"
    },
    subCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category"
    },
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product"
    },
    language: {
    type: String
  },
  format: {
    type: String   
  },
    startDate:Date,
    endDate:Date,

    isListed:{
        type:Boolean,
        default:true
    }


},{timestamps:true})

module.exports=mongoose.model("Offer",offerSchema)