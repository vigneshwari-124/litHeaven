const mongoose = require("mongoose");

const formatSchema = new mongoose.Schema({
  format: {
    type: String,
    enum: ["paperback", "hardcover"],
    required: true
  },
  price: {  
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  sold: {
    type: Number,
    default: 0
  }
}, { _id: false });

const variantSchema = new mongoose.Schema({
  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Language",
    required: true
  },
  thumbnail: {
   url: String,
   publicId: String
  },
  subImages: [{
   url: String,
   publicId: String
  }],
  additionalImages: [{
   url: String,
   publicId: String
  }],
  formats: [formatSchema]
}, { _id: false });


const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
   shortDescription:{
    type:String,
    required:true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
 subCategory: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  required: true
},
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
    required: true
  },
 variants: {
    type: [variantSchema],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length > 0;
      },
      message: "At least one variant required"
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  rating: {
  type: Number,
  default: 0
},
reviewCount: {
  type: Number,
  default: 0
}
}, { timestamps: true });


productSchema.index({ "variants.language": 1 });

module.exports = mongoose.model("Product", productSchema);