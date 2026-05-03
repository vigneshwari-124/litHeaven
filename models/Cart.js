const mongoose = require("mongoose")

const cartItemSchema = new mongoose.Schema({

productId:{
type:mongoose.Schema.Types.ObjectId,
ref:"Product",
required:true
},

languageId:{
type:mongoose.Schema.Types.ObjectId,
ref:"Language",
required:true
},

format:{
type:String,
enum:["paperback","hardcover"],
required:true
},

quantity:{
type:Number,
default:1
}

})


const cartSchema = new mongoose.Schema({

userId:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
required:true
},

items:[cartItemSchema]

},{timestamps:true})


module.exports = mongoose.model("Cart",cartSchema)