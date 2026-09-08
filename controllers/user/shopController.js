const Product=require('../../models/Product')
const Category=require('../../models/Categories')
const Language=require('../../models/Language')
const Author=require('../../models/Author')
const Review = require('../../models/Review') 
const Wishlist=require('../../models/Wishlist')
const Offer=require('../../models/Offers')
const mongoose = require("mongoose")

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getShopPage = async (req, res) => {
  try {

    
 
    const { category, subcategory, author, language, format, price, sort, chip, search } = req.query;
 
    let page = parseInt(req.query.page) || 1
    if (page < 1) page = 1
 
    const limit = 12
 
    let filter = { isDeleted: false };
 
   
    const toArray = (val) => {
      if (!val) return []
      const arr = Array.isArray(val) ? val : val.split(",")
     
      return [...new Set(arr)]
    }
 

    const priceValue = Array.isArray(price) ? [...new Set(price)][0] : price
 
  
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
 
    if (search) {
 
      
      const exactSearch = new RegExp(`^${escapeRegex(search.trim())}$`, "i")
 
      const authors = await Author.find({
        name: exactSearch
      }).select("_id")
 
      const categories = await Category.find({
        name: exactSearch
      }).select("_id")
 
      filter.$or = [
        { title: exactSearch },
        { author: { $in: authors.map(a => a._id) } },
        { category: { $in: categories.map(c => c._id) } },
        { subCategory: { $in: categories.map(c => c._id) } }
      ]
    }
 
    const categoryArr = toArray(category)
    const subcategoryArr = toArray(subcategory)
    const authorArr = toArray(author)
    const languageArr = toArray(language)
    const formatArr = toArray(format)
 
    req.query.category = categoryArr
    req.query.subcategory = subcategoryArr
    req.query.author = authorArr
    req.query.language = languageArr
    req.query.format = formatArr
    req.query.price = priceValue
 
    if (categoryArr.length) {
      filter.category = { $in: categoryArr };
    }
 
    if (subcategoryArr.length) {
      filter.subCategory = { $in: subcategoryArr };
    }
 
    if (authorArr.length) {
      filter.author = { $in: authorArr };
    }
 
    if (languageArr.length) {
      filter["variants.language"] = { $in: languageArr }
    }
 
    if (formatArr.length) {
      filter["variants.formats.format"] = { $in: formatArr }
    }
 
    if (priceValue && !isNaN(priceValue)) {
      filter["variants.formats.price"] = { $lte: Number(priceValue) }
    }
 
    let sortOption = { createdAt: -1 }
 
 
    if (sort === "az") {
      sortOption = { title: 1 }
    }
 
    if (sort === "za") {
      sortOption = { title: -1 }
    }
 
    if (chip === "new") { sortOption = { createdAt: -1 } }
 
 
    const isPriceSort = sort === "price-asc" || sort === "price-desc"
 
    const products = await Product.find(filter)
      .sort(sortOption)
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
 
    const productIds = products.map(p => p._id)
 
    const ratingData = await Review.aggregate([
      {
        $match: { product: { $in: productIds } }
      },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ])
 
    const ratingMap = {}
 
    ratingData.forEach(r => {
      ratingMap[r._id.toString()] = {
        avg: Math.round(r.avgRating),
        count: r.count
      }
    })
 
    const validProducts = products.filter(
      p => p.category && p.subCategory && p.author
    );
 
    const now = new Date()
 
    const offers = await Offer.find({
      isListed: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
 
    let wishlistItems = []
 
    if (req.session.userId) {
      wishlistItems = await Wishlist.find({
        userId: req.session.userId
      }).select("productId")
    }
 
    const productsWithStock = validProducts.map(p => {
 
      let totalStock = 0
 
      p.variants.forEach(v => {
        v.formats.forEach(f => {
          totalStock += f.stock
        })
      })
 
      let lowPrice = Infinity
      let highPrice = -Infinity
 
      p.variants.forEach(v => {
        v.formats.forEach(f => {
          if (f.price < lowPrice) lowPrice = f.price
          if (f.price > highPrice) highPrice = f.price
        })
      })
 
      let discount = 0
 
      const productId = p._id.toString()
      const subCategoryId = p.subCategory?._id?.toString()
      const categoryId = p.category?._id?.toString()
 
      const productOffer = offers.find(o =>
        o.type === "product" &&
        o.product?.toString() === productId
      )
 
      const subOffer = offers.find(o =>
        o.type === "subcategory" &&
        o.subCategory?.toString() === subCategoryId
      )
 
      const catOffer = offers.find(o =>
        o.type === "category" &&
        o.category?.toString() === categoryId
      )
 
      const offerList = []
 
      if (productOffer) offerList.push(productOffer.discount)
      if (subOffer) offerList.push(subOffer.discount)
      if (catOffer) offerList.push(catOffer.discount)
 
      if (offerList.length > 0) {
        discount = Math.max(...offerList)
      }
 
      let finalLow = lowPrice
      let finalHigh = highPrice
 
      if (discount > 0) {
        finalLow = Math.round(lowPrice - (lowPrice * discount / 100))
        finalHigh = Math.round(highPrice - (highPrice * discount / 100))
      }
 
      const isWishlisted = wishlistItems.some(
        w => w.productId.toString() === p._id.toString()
      )
 
      const rating = ratingMap[p._id.toString()] || null
 

      const thumbnail = p.variants?.[0]?.thumbnail?.url || '/images/no-image.png'
 
      const hasStock = totalStock > 0
 
      
      const showHigh = sort === "price-desc"
 
      const originalPrice = showHigh ? highPrice : lowPrice
      const finalPrice = showHigh ? finalHigh : finalLow
 
      return {
        ...p.toObject(),
        isWishlisted,
        isOutOfStock: !hasStock,
        hasStock,
        thumbnail,
        rating: rating ? rating.avg : 0,
        ratingCount: rating ? rating.count : 0,
        originalPrice,
        finalPrice,
        discount,
     
        _sortPrice: finalPrice
      }
    })
 
    if (sort === "price-asc") {
      productsWithStock.sort((a, b) => a._sortPrice - b._sortPrice)
    } else if (sort === "price-desc") {
      productsWithStock.sort((a, b) => b._sortPrice - a._sortPrice)
    }
 
    if (chip === "ratings") {
      productsWithStock.sort((a, b) => b.rating - a.rating)
    }
 
    const totalCount = productsWithStock.length
    const totalPages = Math.ceil(totalCount / limit)
 
    if (page > totalPages && totalPages > 0) {
      page = totalPages
    }
 
    const skip = (page - 1) * limit
 
    const pageProducts = productsWithStock
      .slice(skip, skip + limit)
      .map(({ _sortPrice, ...rest }) => rest) 
 
    const priceData = await Product.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$variants" },
      { $unwind: "$variants.formats" },
      {
        $group: {
          _id: null,
          maxPrice: { $max: "$variants.formats.price" },
          minPrice: { $min: "$variants.formats.price" }
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
 
    
    const selected = {
      category: categoryArr,
      subcategory: subcategoryArr,
      author: authorArr,
      language: languageArr,
      format: formatArr,
    }
 
    const buildLink = (overrides = {}) => {
      const merged = { ...req.query, ...overrides }
      const qs = new URLSearchParams()
      Object.entries(merged).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "") return
        if (key === "page" && String(val) === "1") return 
        qs.set(key, Array.isArray(val) ? val.join(",") : val)
      })
      const qsString = qs.toString()
      return qsString ? "/shop?" + qsString : "/shop"
    }
 
    const formatLabels = { paperback: "Paper Back", hardcover: "Hard Cover" }
 
    const activeTags = []
 
    subcategoryArr.forEach(id => {
      const sub = subCategories.find(s => s._id.toString() === id)
      if (sub) {
        activeTags.push({
          label: sub.name,
          url: buildLink({ subcategory: subcategoryArr.filter(v => v !== id).join(","), page: 1 })
        })
      }
    })
 
    authorArr.forEach(id => {
      const a = authors.find(x => x._id.toString() === id)
      if (a) {
        activeTags.push({
          label: a.name,
          url: buildLink({ author: authorArr.filter(v => v !== id).join(","), page: 1 })
        })
      }
    })
 
    languageArr.forEach(id => {
      const l = languages.find(x => x._id.toString() === id)
      if (l) {
        activeTags.push({
          label: l.languageName,
          url: buildLink({ language: languageArr.filter(v => v !== id).join(","), page: 1 })
        })
      }
    })
 
    formatArr.forEach(val => {
      activeTags.push({
        label: formatLabels[val] || val,
        url: buildLink({ format: formatArr.filter(v => v !== val).join(","), page: 1 })
      })
    })
 
    res.render('user/shop', {
      isLoggedIn: req.session.isLoggedIn || false,
      userId: req.session.userId || null,
      buildLink,
      activeTags,
 
      products: pageProducts,
      totalCount,
      totalPages,
      currentPage: page,
 
      categories: categoryMap,
      authors,
      languages,
 
      maxPrice,
      minPrice,
 
      query: req.query,
      selected,
 
      sort: sort || "",
      chip: chip || "new",
      search: search || "",
      price: priceValue ? Number(priceValue) : maxPrice
    });
 
  } catch (err) {
    console.log(err);
    res.status(500).render('error', { message: "Something went wrong loading the shop." });
  }
}
 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
const toggleWishlist = async (req, res) => {
  try {

    if (!req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    const userId = req.session.userId;
    const { productId } = req.params;

    const { languageId, format } = req.body;

    if (!languageId || !format) {
      return res.status(400).json({
        success: false,
        message: "Language and format are required"
      });
    }

    const existing = await Wishlist.findOne({
      userId,
      productId,
      languageId,
      format
    });

    if (existing) {

      await Wishlist.deleteOne({
        _id: existing._id
      });

      return res.json({
        success: true,
        isWishlisted: false
      });

    } else {

      await Wishlist.create({
        userId,
        productId,
        languageId,
        format
      });

      return res.json({
        success: true,
        isWishlisted: true
      });
    }

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
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
      return res.status(404).render("errors/404");
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


const defaultStock = defaultFormat.stock;
const defaultPrice = defaultFormat.price;

// ← இங்க போடு
const now = new Date()

const offers = await Offer.find({
  isListed: true,
  startDate: { $lte: now },
  endDate: { $gte: now }
})

const pid = product._id.toString()
const subCatId = product.subCategory?._id?.toString()
const catId = product.category?._id?.toString()

const productOffer = offers.find(o =>
  o.type === "product" &&
  o.product?.toString() === pid
)

const subOffer = offers.find(o =>
  o.type === "subcategory" &&
  o.subCategory?.toString() === subCatId
)

const catOffer = offers.find(o =>
  o.type === "category" &&
  o.category?.toString() === catId
)

let discount = 0

const offerList = []

if(productOffer){

  offerList.push(productOffer.discount)

}

if(subOffer){

  offerList.push(subOffer.discount)

}

if(catOffer){

  offerList.push(catOffer.discount)

}

if(offerList.length > 0){

  discount = Math.max(...offerList)

}

const offerPrice = discount > 0
  ? Math.round(defaultPrice - (defaultPrice * discount / 100))
  : defaultPrice

    
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
      wished,
      discount,
      offerPrice
    });

  } catch (error) {
    console.log(error);
    return res.status(404).render("errors/404");
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports={
  getShopPage,
  toggleWishlist,
  productDetailPage
}