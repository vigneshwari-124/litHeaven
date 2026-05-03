const mongoose = require("mongoose")

const wishlistSchema = new mongoose.Schema({

userId:{
type:mongoose.Schema.Types.ObjectId,
ref:"User",
required:true
},

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
}

},{timestamps:true})

wishlistSchema.index({userId:1,
productId:1,
languageId:1,
format:1
},{unique:true})

module.exports = mongoose.model("Wishlist",wishlistSchema)