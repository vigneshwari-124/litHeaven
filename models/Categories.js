const mongoose=require('mongoose')

const CategorySchema=new mongoose.Schema({
    name:{
        type:String,
        lowercase: true,

    },
    description:String,
    image: {
    url: String,
    public_id: String
   },
   isDeleted: {
    type: Boolean,
    default: false
  },
    isFeatured:{
        type:Boolean,
        default:false
    },
    parentCategory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        default:null
    },
     createdAt: {
      type: Date,
      default: Date.now
    }

},{timestamps:true})

module.exports=mongoose.model("Category",CategorySchema)