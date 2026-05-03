// const getCart = async (req,res)=>{

// const userId = req.session.userId

// const cart = await Cart.findOne({userId})
// .populate({
// path:"items.productId",
// populate:{
// path:"author"
// }
// })
// .populate("items.languageId")

// if(!cart || cart.items.length === 0){

// return res.json({
// items:[]
// })

// }

// res.json({items:cart.items})

// }

// // const getCart = async (req,res)=>{
// // try{

// // const userId = req.session.userId

// // const cart = await Cart.findOne({userId})
// // .populate("items.productId")
// // .populate("items.languageId")

// // if(!cart){
// // return res.json({items:[]})
// // }

// // res.json({items:cart.items})

// // }catch(err){
// // res.status(500).json({error:"Server error"})
// // }
// // }



// const addToCart = async(req,res)=>{

// const {productId,languageId,format} = req.body
// const userId = req.session.userId

// if(!userId){
// return res.status(401).json({
// success:false,
// message:"Please login "
// })
// }
// let cart = await Cart.findOne({userId})

// if(!cart){

// cart = new Cart({
// userId,
// items:[{productId,languageId,format,quantity:1}]
// })

// await cart.save()

// return res.json({
//   success:true

// })

// }

// const item = cart.items.find(i =>
// i.productId.toString()===productId &&
// i.languageId.toString()===languageId &&
// i.format===format
// )

// if(item){

//   if(item.quantity >= 8){
// return res.json({
// success:false,
// message:"Maximum 8 quantity allowed for this item"
// })
// }

// item.quantity++

// }else{

// cart.items.push({
// productId,
// languageId,
// format,
// quantity:1
// })

// }

// await cart.save()

// res.json({
//   success:true,
//   message:"Product added to cart 🛒"
// })

// }



// // const updateCartQty = async (req,res)=>{
// // try{

// // const {itemId,qty} = req.body
// // const userId = req.session.userId

// // if(!mongoose.Types.ObjectId.isValid(itemId)){
// // return res.json({
// // success:false,
// // message:"Invalid item id format"
// // })
// // }

// // if(qty > 8){
// // return res.json({
// // success:false,
// // message:"Maximum 8 quantity allowed"
// // })
// // }

// // if(qty < 1){
// // return res.json({
// // success:false,
// // message:"Minimum quantity is 1"
// // })
// // }

// // const cart = await Cart.findOne({userId})

// // const item = cart.items.id(itemId)

// // if(!item){
// // return res.json({
// // success:false,
// // message:"Item not found"
// // })
// // }

// // item.quantity = qty

// // await cart.save()

// // res.json({
// // success:true
// // })

// // }catch(err){
// // console.log(err)
// // res.json({
// // success:false,
// // message:"Unable to update quantity"
// // })
// // }
// // }

// const updateCartQty = async(req,res)=>{

// const {itemId,qty} = req.body

// await Cart.updateOne(
// {"items._id":itemId},
// {
// $set:{
// "items.$.quantity":qty
// }
// }
// )

// res.json({success:true})

// }


// const removeCartItem = async(req,res)=>{

// const {itemId} = req.body
// const userId = req.session.userId

// const cart = await Cart.findOne({userId})

// cart.items = cart.items.filter(i => i._id.toString() !== itemId)

// await cart.save()

// res.json({success:true})

// }