
const Cart=require('../../models/Cart')
const Product=require('../../models/Product')
const Offer=require('../../models/Offers')


// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const cartPage = async (req,res)=>{
     res.render("user/cart",{
      isLoggedIn:req.session.userId 
     })
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const addToCart = async (req, res) => {
  try {

    const userId = req.session.userId
    const { productId, languageId, format } = req.body

    if (!userId) {
      return res.status(401).json({
        status: "login-required"
      })
    }

    let cart = await Cart.findOne({ userId })

    if (!cart) {
      cart = await Cart.create({
        userId,
        items: []
      })
    }

    const existingItem = cart.items.find(item =>
      item.productId.toString() === productId &&
      item.languageId.toString() === languageId &&
      item.format === format
    )

    if (cart.items.length >= 10 && !existingItem) {

  return res.json({
    status: "cart-limit",
    message: "Maximum 10 products allowed in cart"
  })

}

    if (existingItem) {

      if (existingItem.quantity >= 8) {
        return res.json({
          status: "max-reached"
        })
      }

      existingItem.quantity += 1
    }
    else {
    
      cart.items.push({
        productId,
        languageId,
        format,
        quantity: 1
      })
    }

    

    await cart.save()

    res.json({
      status: "added"
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getCart = async (req, res) => {
  try {

    const userId = req.session.userId

    if (!userId) {
      return res.json({
        items: []
      })
    }
const cart = await Cart.findOne({ userId })
.populate({
  path: "items.productId",
  match: { isDeleted: false },
  populate: [
    { path: "author", match: { isDeleted: false } },
    { path: "category", match: { isDeleted: false } },
    { path: "subCategory", match: { isDeleted: false } },
    { path: "variants.language" }
  ]
})
.populate("items.languageId")

if (!cart) return res.json({ items: [] })

const now = new Date()
const offers = await Offer.find({
  isListed: true,
  startDate: { $lte: now },
  endDate: { $gte: now }
})

const items = cart.items
  .filter(item => item.productId !== null)
  .map(item => {
    const product = item.productId

    const variant = product?.variants?.find(
      v => v.language._id.toString() === item.languageId._id.toString()
    )

    const formatData = variant?.formats?.find(
      f => f.format === item.format
    )

    const originalPrice = formatData?.price || 0

   
    const pid = product._id.toString()
    const subCatId = product.subCategory?._id?.toString()
    const catId = product.category?._id?.toString()

    const productOffer = offers.find(o =>
      o.type === "product" && o.product?.toString() === pid
    )
    const subOffer = offers.find(o =>
      o.type === "subcategory" && o.subCategory?.toString() === subCatId
    )
    const catOffer = offers.find(o =>
      o.type === "category" && o.category?.toString() === catId
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
      ? Math.round(originalPrice - (originalPrice * discount / 100))
      : originalPrice

    return {
      ...item.toObject(),
      stock: formatData?.stock || 0,
      originalPrice,
      offerPrice,
      discount
    }
  })

res.json({ items })
   

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const removeCartItem = async (req, res) => {
  try {
    const userId = req.session.userId
    const { productId, languageId, format } = req.body

    if (!userId) {
      return res.status(401).json({ status: "login-required" })
    }

    const cart = await Cart.findOne({ userId })

    if (!cart) {
      return res.json({ status: "empty" })
    }

    cart.items = cart.items.filter(item =>
      !(
        item.productId.toString() === productId &&
        item.languageId.toString() === languageId &&
        item.format === format
      )
    )

    await cart.save()

    res.json({ status: "removed" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const clearCart = async (req, res) => {
  try {
    const userId = req.session.userId

    if (!userId) {
      return res.status(401).json({ status: "login-required" })
    }

    const cart = await Cart.findOne({ userId })

    if (!cart) {
      return res.json({ status: "empty" })
    }

    cart.items = []

    await cart.save()

    res.json({ status: "cleared" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}


const updateCartQty = async (req, res) => {
  try {
    const userId = req.session.userId
    const { productId, languageId, format, quantity } = req.body

    if (!userId) return res.status(401).json({ status: "login-required" })

    const cart = await Cart.findOne({ userId })
    if (!cart) return res.json({ status: "not-found" })

    const item = cart.items.find(i =>
      i.productId.toString() === productId &&
      i.languageId.toString() === languageId &&
      i.format === format
    )

    if (!item) return res.json({ status: "item-not-found" })

    //  Check actual stock before saving
    const product = await Product.findById(productId).populate("variants.language")
    const variant = product?.variants?.find(
      v => v.language._id.toString() === languageId
    )
    const formatData = variant?.formats?.find(f => f.format === format)
    const stock = formatData?.stock || 0

    if (quantity > stock) {
      return res.json({ status: "out-of-stock", availableStock: stock })
    }

    if (quantity > 8) return res.json({ status: "max-reached" })
    if (quantity < 1) return res.json({ status: "min-reached" })

    item.quantity = quantity
    await cart.save()

    res.json({ status: "updated" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "server error" })
  }
}



module.exports={
    cartPage,
    addToCart,
    getCart,
    removeCartItem,
    clearCart,
    updateCartQty
 }