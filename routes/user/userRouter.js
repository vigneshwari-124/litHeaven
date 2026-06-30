const express=require('express')
const router=express.Router()

const userController=require('../../controllers/user/userController')
const profileController=require('../../controllers/user/profileController')
const addressController=require('../../controllers/user/addressController')
const shopContoller=require('../../controllers/user/shopController')
const reviewController = require('../../controllers/user/reviewController')
const wishlistController=require('../../controllers/user/wishlistController')
const cartController=require('../../controllers/user/cartController')
const orderController=require('../../controllers/user/orderController')
const walletController=require('../../controllers/user/walletController')


const noCache = require('../../middlewares/noCache');
const auth=require('../../middlewares/auth');
const preventAuth = require('../../middlewares/preventAuth');
const upload=require('../../middlewares/upload')
const checkBlocked = require('../../middlewares/checkBlocked')

const passport = require('passport')

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/',userController.getHome)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/auth/google',passport.authenticate("google",{scope:["profile","email"]}))
router.get('/auth/google/callback',userController.googleAuthCallback);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/signup',preventAuth,userController.getSignup)
router.post('/signup',userController.postSignup)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/login',preventAuth,userController.getLogin)
router.post('/login',userController.postLogin)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/otp', noCache, userController.getOtp);
router.post('/otp',userController.postOtp)
router.post('/otp/resend',userController.resendOtp)
router.post('/clear-otp-session',userController.clearOtpSession)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/forgot-password',preventAuth,userController.getForgot)
router.post('/forgot-password',userController.postForgot)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/reset-password',userController.getResetPass)
router.post('/reset-password',userController.postRestPass)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/profile',auth,checkBlocked,profileController.getProfile)
router.post('/profile/edit',profileController.editProfile)
router.get('/profile/change-email',profileController.getChangeEmail)
router.post('/profile/change-email',profileController.postChangeEmil)
router.post('/profile/upload-image',upload.single('profileImage'),profileController.uploadProfileImg)
router.delete('/profile/delete-image',profileController.deleteProfileImg)
router.post('/profile/change-password',profileController.changePassword)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/addresses',auth,checkBlocked,addressController.getAddresses)
router.post('/addresses/add',auth,addressController.addAddress)
router.put('/addresses/edit/:id',auth,addressController.editAddress);
router.delete( '/addresses/delete/:id',auth,addressController.deleteAddress);
router.get('/api/addresses', auth, addressController.getAddressesAPI);
router.patch('/addresses/set-primary/:id', auth, addressController.setPrimaryAddress);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/blocked', (req, res) => {
  res.render('user/blocked')
})

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/shop',shopContoller.getShopPage)
router.get('/api/shop',shopContoller.shopPage)
router.get('/product/:id',shopContoller.productDetailPage)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.get('/logout',userController.logout)

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

router.post('/review/add',auth,reviewController.addReview)

// ===================================================================================================================//

router.get('/wishlist',auth,wishlistController.wishlistPage)
router.post('/wishlist/toggle',auth,wishlistController.addWishlist)
router.get('/wishlist-data',auth,wishlistController.getWishlist)
router.delete("/remove-wishlist/:id",wishlistController. removeWishlist)
router.delete("/clear-wishlist",wishlistController. clearWishlist)
router.post("/move-to-cart",wishlistController. moveToCart)

//===================================================================================================================================//

router.get('/cart',auth,noCache,cartController.cartPage)
router.post('/add-to-cart',auth,cartController.addToCart)
router.get('/get-cart',auth,cartController.getCart)
router.post("/remove-cart-item",auth,cartController.removeCartItem)
router.post("/clear-cart",auth,cartController.clearCart)
router.post("/update-cart-qty",auth,cartController.updateCartQty)


//=============================================================================================================================================
router.get('/checkout',auth,noCache,orderController.checkoutPage)
router.get('/checkout/check-stock', auth, orderController.checkStock);
router.post('/checkout/place-order', auth, orderController.placeOrder);
router.post('/verify-payment', auth, orderController.verifyPayment);
router.post('/payment-failed', auth, orderController.paymentFailed);
router.get('/coupons',auth,orderController.getAvailableCoupons)
router.post('/apply-coupon',auth,orderController.applyCoupon)
router.get('/order',auth,orderController.orderPage)
router.get('/api/orders', auth, orderController.getUserOrders);
router.put("/api/orders/:orderId/cancel-item/:itemId", orderController.cancelSingleItem);
router.put("/api/orders/:orderId/cancel-order", orderController.cancelFullOrder);
router.put("/api/orders/:orderId/return-item/:itemId", orderController.returnItem);
router.put("/api/orders/:orderId/return-order", orderController.returnFullOrder);
router.post("/retry-payment/:orderId",auth,orderController.retryPayment);
router.get('/checkout/check-stock',auth,orderController.checkStockStatus);

//=========================================================================================================================================================

router.get('/wallet',auth,walletController.walletPage)
router.get('/wallet-data', auth,walletController.getWallet)
router.post('/wallet/add-success',auth,walletController. addMoneySuccess);

module.exports=router