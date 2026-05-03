const Wishlist=require('../../models/Wishlist')
const Cart = require("../../models/Cart")

const wishlistPage=(req,res)=>{
    res.render('user/wishlist')
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const addWishlist=async(req,res)=>{
 try{

    const { productId, languageId, format } = req.body
    if(!req.session.userId){
 return res.status(401).json({
 status:"login-required."
 })
 }

 const userId = req.session.userId 

    const exist = await Wishlist.findOne({
      userId,
      productId,
      languageId,
      format
    })

    if(exist){
      await Wishlist.deleteOne({_id: exist._id})
      return res.json({status:"removed"})
    }

    await Wishlist.create({
      userId,
      productId,
      languageId,
      format
    })

    res.json({status:"added"})

  }catch(err){
    console.log(err)
    res.status(500).json({error:"server error"})
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.userId

    if (!userId) {
      return res.json({
        items: [],
        totalPages: 0
      })
    }

    const page = parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit

    // 🔥 total count (optional: clean count later)
    const totalItems = await Wishlist.countDocuments({ userId })
    const totalPages = Math.ceil(totalItems / limit)

    // 🔥 populate + filter deleted
    const wishlist = await Wishlist.find({ userId })
      .populate({
        path: "productId",
        match: { isDeleted: false },   // ✅ product filter
        populate: [
          { path: "author", match: { isDeleted: false } },      // ✅ author filter
          { path: "category", match: { isDeleted: false } },    // ✅ category filter
          { path: "subCategory", match: { isDeleted: false } }, // ✅ subcategory filter
          { path: "variants.language" }
        ]
      })
      .populate("languageId")
      .skip(skip)
      .limit(limit)

    // 🔥 remove null (deleted items)
    const validItems = wishlist.filter(item => item.productId !== null)

    // 🔥 map + stock
    const items = validItems.map(item => {

      const product = item.productId

      const variant = product?.variants?.find(
        v => v.language._id.toString() === item.languageId._id.toString()
      )

      const formatData = variant?.formats?.find(
        f => f.format === item.format
      )

      return {
        ...item.toObject(),
        stock: formatData?.stock || 0
      }
    })

    res.json({
      items,
      totalPages,
      currentPage: page,
      totalItems
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({
      error: "server error"
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const removeWishlist = async (req, res) => {
  try {
    const userId = req.session.userId
    const wishlistId = req.params.id

    await Wishlist.deleteOne({
      _id: wishlistId,
      userId: userId   
    })

    res.json({ status: "removed" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const clearWishlist = async (req, res) => {
  try {
    const userId = req.session.userId

    if (!userId) {
      return res.status(401).json({ error: "Login required" })
    }

    await Wishlist.deleteMany({ userId })  

    res.json({ status: "cleared" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const moveToCart = async (req, res) => {
  try {
    const userId = req.session.userId
    const { productId, languageId, format, wishlistId } = req.body

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Login required"
      })
    }

    let cart = await Cart.findOne({ userId })

    if (!cart) {
      cart = new Cart({ userId, items: [] })
    }

    const existItem = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.languageId.toString() === languageId &&
        item.format === format
    )


    if (existItem) {
      return res.json({
        status: "already",
        message: "Product already in cart 🛒"
      })
    }

    await Wishlist.deleteOne({ _id: wishlistId, userId })


    cart.items.push({
      productId,
      languageId,
      format,
      quantity: 1
    })

    await cart.save()

    res.json({
      status: "added",
      message: "Product added to cart 🛒"
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({
      status: "error",
      message: "Something went wrong"
    })
  }
}


module.exports={
    wishlistPage,
    addWishlist,
    getWishlist,
    removeWishlist,
    clearWishlist,
    moveToCart
}