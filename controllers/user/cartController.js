
const Cart=require('../../models/Cart')
const Product=require('../../models/Product')


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

    return {
      ...item.toObject(),
      stock: formatData?.stock || 0
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

module.exports={
    cartPage,
    addToCart,
    getCart,
    removeCartItem,
    clearCart
 }