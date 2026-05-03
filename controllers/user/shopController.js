const Product=require('../../models/Product')
const Category=require('../../models/Categories')
const Language=require('../../models/Language')
const Author=require('../../models/Author')
const Review = require('../../models/Review') 
const Wishlist=require('../../models/Wishlist')
const Offer=require('../../models/Offers')
const mongoose = require("mongoose")

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getShopPage=(req,res)=>{
  res.render('user/shop',{
    isLoggedIn: req.session.isLoggedIn || false,
  userId: req.session.userId || null
  }
  )
  
}

const shopPage = async (req, res) => {
  try {

    const { category, subcategory, author, language, format, price, sort, chip, search } = req.query;

    let page = parseInt(req.query.page) || 1
    if(page < 1) page = 1

    const limit = 12
 
    let filter = { isDeleted: false };



if(search){

const authors = await Author.find({
name: { $regex: search, $options: "i" }
}).select("_id")

const categories = await Category.find({
name: { $regex: search, $options: "i" }
}).select("_id")

filter.$or = [

{ title: { $regex: search, $options: "i" } },

{ author: { $in: authors.map(a => a._id) } },

{ category: { $in: categories.map(c => c._id) } },

{ subCategory: { $in: categories.map(c => c._id) } }

]

}

    if (category) {
      const categories = category.split(",")
      filter.subCategory = { $in: categories };
    }

    if (subcategory) {
  const subcats = subcategory.split(",");
  filter.subCategory = { $in: subcats };
}

    if (author) {
       const authors = author.split(",")

      filter.author = { $in: authors };
    }

    if (language) {
      const languages = language.split(",")
     filter["variants.language"] = { $in: languages }
    }

   if (format) {

  const formats = format.split(",")

  filter["variants.formats.format"] = { $in: formats }

  }

if (price && !isNaN(price)) {

filter["variants.formats.price"] = { $lte: Number(price) }

}

let sortOption = { createdAt: -1 }

if (sort === "price-asc") {
  sortOption = { "variants.0.formats.0.price": 1 }
}

if (sort === "price-desc") {
  sortOption = { "variants.0.formats.0.price": -1 }
}

if (sort === "az") {
  sortOption = { title: 1 }
}

if (sort === "za") {
  sortOption = { title: -1 }
}
if(chip === "new"){ sortOption = { createdAt: -1 }}
if(chip === "ratings"){sortOption = { rating: -1 }}


const totalCount = await Product.countDocuments(filter);
const totalPages = Math.ceil(totalCount / limit)

if(page > totalPages && totalPages > 0){
  page = totalPages
}

const skip = (page - 1) * limit

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate({
       path: "category",
       match: { isDeleted: false }
       })
       .populate({
        path: "subCategory",
        match: { isDeleted: false }
      })
      .populate({
        path: "author",
        match: { isDeleted: false }
      })
      .populate("variants.language")


      const today = new Date()

const offers = await Offer.find({
  isListed: true,
  startDate: { $lte: today },
  endDate: { $gte: today }
})

const offerMap = {
  product: {},
  subcategory: {},
  category: {}
}

offers.forEach(o => {
  if (o.type === "product" && o.product) {
    offerMap.product[o.product.toString()] = o.discount
  }

  if (o.type === "subcategory" && o.subCategory) {
    offerMap.subcategory[o.subCategory.toString()] = o.discount
  }

  if (o.type === "category" && o.category) {
    offerMap.category[o.category.toString()] = o.discount
  }
})


      const productIds = products.map(p => p._id)

const ratingData = await Review.aggregate([
{
$match:{ product:{ $in: productIds } }
},
{
$group:{
_id:"$product",
avgRating:{ $avg:"$rating" },
count:{ $sum:1 }
}
}
])

const ratingMap = {}

ratingData.forEach(r=>{
ratingMap[r._id.toString()] = {
avg: Math.round(r.avgRating),
count: r.count
}
})

      const validProducts = products.filter(
      p => p.category && p.subCategory && p.author
      );

const productsWithStock = validProducts.map(p => {

let totalStock = 0

p.variants.forEach(v=>{
  v.formats.forEach(f=>{
    totalStock += f.stock
  })
})

let minPrice = Infinity

p.variants.forEach(v=>{
  v.formats.forEach(f=>{
    if(f.price < minPrice) minPrice = f.price
  })
})

let productOffer = offerMap.product[p._id.toString()] || 0

let subCategoryOffer =
  offerMap.subcategory[p.subCategory?._id?.toString()] || 0

let categoryOffer =
  offerMap.category[p.category?._id?.toString()] || 0


let discount = 0

if(productOffer > 0){
  discount = productOffer
}
else if(subCategoryOffer > 0){
  discount = subCategoryOffer
}
else if(categoryOffer > 0){
  discount = categoryOffer
}

let finalPrice = minPrice

if(discount > 0){
  finalPrice = Math.round(
    minPrice - (minPrice * discount / 100))
}

const rating = ratingMap[p._id.toString()] || null

return {
  ...p.toObject(),

  isOutOfStock: totalStock === 0,

  rating: rating ? rating.avg : 0,
  ratingCount: rating ? rating.count : 0,

  
  originalPrice: minPrice,
  finalPrice,
  discount
}
})


const priceData = await Product.aggregate([
  { $match: { isDeleted:false } },
  { $unwind: "$variants" },
  { $unwind: "$variants.formats" },
  {
    $group: {
      _id:null,
      maxPrice:{ $max:"$variants.formats.price" },
      minPrice:{ $min:"$variants.formats.price" }
    }
  }
])

const maxPrice = priceData.length ? priceData[0].maxPrice : 3000
const minPrice = priceData.length ? priceData[0].minPrice : 0

    const categories = await Category.find({
      parentCategory: null,
      isDeleted: false
    });

    const subCategories = await Category.find({
      parentCategory: { $ne: null },
      isDeleted: false
    });

   const categoryMap = categories.map(cat => {

      const subs = subCategories.filter(
        sub => sub.parentCategory.toString() === cat._id.toString()
      );

      return {
        ...cat._doc,
        subCategories: subs
      };

    });


    const authors = await Author.find({ isDeleted: false });
    const languages = await Language.find({ status: "active" });

     
    

    res.json({
  products: productsWithStock,
  totalCount,
  totalPages,
  currentPage: Number(page),
  categories: categoryMap,
  authors,
  languages,
  maxPrice,
  minPrice,
  selectedFilters: req.query
  
});

  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const productDetailPage = async (req, res) => {
  try {

    const productId = req.params.id;

   const product = await Product.findOne({
_id: productId,
isDeleted: false
})
.populate("author")
.populate("category")
.populate("subCategory")
.populate("variants.language")

    if (!product) {
      return res.redirect("/shop");
    }

      product.variants = product.variants.filter(v =>
      v.language && v.language.status === "active"
    );

    product.variants.forEach(v => {

   let totalStock = 0

    v.formats.forEach(f=>{
    totalStock += f.stock
    })

    v.totalStock = totalStock
    v.isOutOfStock = totalStock === 0

   })

   product.variants.sort((a,b)=>{

   if(a.isOutOfStock === b.isOutOfStock) return 0

     return a.isOutOfStock ? 1 : -1

   })

     let defaultVariant = product.variants.find(v =>
      v.language.languageCode === "english"
    );


    if (!defaultVariant) {
      defaultVariant = product.variants[0];
    }

    let defaultFormat = defaultVariant.formats.find(f =>
      f.format === "paperback"
    );

        if (!defaultFormat) {
      defaultFormat = defaultVariant.formats[0];
    }

   const defaultStock = defaultFormat.stock;
    const defaultPrice = defaultFormat.price;

    let minPrice = Infinity;

    product.variants.forEach(variant => {
      variant.formats.forEach(format => {
        if (format.price < minPrice) {
          minPrice = format.price;
        }
      });
    });

    if (minPrice === Infinity) {
      minPrice = 0;
    }

    let totalStock = 0;

    product.variants.forEach(variant => {
      variant.formats.forEach(format => {
        totalStock += format.stock;
      });
    });

    
const recommendedProducts = await Product.find({
  category: product.category._id,
  _id: { $ne: product._id },
  isDeleted: false
})
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
.populate("variants.language")
.limit(20);

const recommended = recommendedProducts.map(p => {

  let lowestPrice = Infinity
  
  let totalStock = 0   

  p.variants.forEach(v=>{
    v.formats.forEach(f=>{
      if(f.price < lowestPrice){
        lowestPrice = f.price
      }
      totalStock += f.stock   
    })
  })

  return {
    _id: p._id,
    title: p.title,
    image: p.variants[0]?.thumbnail?.url || "",
    price: lowestPrice,
    stock: totalStock,                
    isOutOfStock: totalStock === 0     
  }
})
recommended.sort((a,b)=> b.price - a.price);

const recommendedFinal = recommended.slice(0,12);
    
const reviews = await Review.find({ product: productId })
.populate("user","name")
.sort({ createdAt:-1 })

let highestRating = 0

if(reviews && reviews.length > 0){

reviews.forEach(r=>{
if(r.rating > highestRating){
highestRating = r.rating
}
})

}

let five=0,four=0,three=0,two=0,one=0,total=0,sum=0

reviews.forEach(r=>{

sum += r.rating
total++

if(r.rating===5) five++
if(r.rating===4) four++
if(r.rating===3) three++
if(r.rating===2) two++
if(r.rating===1) one++

})

const percent = (count)=>{
return total ? Math.round((count/total)*100) : 0
}

const ratingData = {

avgRating : total ? (sum/total).toFixed(1) : 0,

totalReviews : total,

five  : percent(five),
four  : percent(four),
three : percent(three),
two   : percent(two),
one   : percent(one)

}

let wished = false

if(req.session.userId){

const wish = await Wishlist.findOne({
userId: req.session.userId,
productId: productId,
languageId: defaultVariant.language._id,
format: defaultFormat.format
})

if(wish){
wished = true
}

}

    res.render("user/productDetail", {
      product,
      defaultVariant,
      defaultFormat,
      defaultStock,
      defaultPrice,
      minPrice,
      totalStock,
      recommendedProducts: recommendedFinal,
      reviews,
      ratingData,
      highestRating,
      isLoggedIn: req.session.isLoggedIn || false,
      userId: req.session.userId || null,
      wished
    });

  } catch (error) {
    console.log(error);
    res.redirect("/shop");
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
  getShopPage,
  shopPage,
  productDetailPage
}