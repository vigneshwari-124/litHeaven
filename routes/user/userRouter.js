const express=require('express')
const router=express.Router()

const userController=require('../../controllers/user/userController')
const profileController=require('../../controllers/user/profileController')
const addressController=require('../../controllers/user/addressController')

const noCache = require('../../middlewares/noCache');
const auth=require('../../middlewares/auth');
const preventAuth = require('../../middlewares/preventAuth');
const upload=require('../../middlewares/upload')
const checkBlocked = require('../../middlewares/checkBlocked')

const passport = require('passport')

router.get('/',userController.getHome)

router.get('/auth/google',passport.authenticate("google",{scope:["profile","email"]}))
router.get('/auth/google/callback',userController.googleAuthCallback);

router.get('/signup',preventAuth,userController.getSignup)
router.post('/signup',userController.postSignup)

router.get('/login',preventAuth,userController.getLogin)
router.post('/login',userController.postLogin)

router.get('/otp', noCache, userController.getOtp);
router.post('/otp',userController.postOtp)
router.post('/otp/resend',userController.resendOtp)
router.post('/clear-otp-session',userController.clearOtpSession)

router.get('/forgot-password',preventAuth,userController.getForgot)
router.post('/forgot-password',userController.postForgot)

router.get('/reset-password',userController.getResetPass)
router.post('/reset-password',userController.postRestPass)


router.get('/profile',auth,checkBlocked,profileController.getProfile)
router.post('/profile/edit',profileController.editProfile)
router.get('/profile/change-email',profileController.getChangeEmail)
router.post('/profile/change-email',profileController.postChangeEmil)
router.post('/profile/upload-image',upload.single('profileImage'),profileController.uploadProfileImg)
router.delete('/profile/delete-image',profileController.deleteProfileImg)
router.post('/profile/change-password',profileController.changePassword)


router.get('/addresses',auth,checkBlocked,addressController.getAddresses)
router.post('/addresses/add',auth,addressController.addAddress)
router.put('/addresses/edit/:id',auth,addressController.editAddress);
router.delete( '/addresses/delete/:id',auth,addressController.deleteAddress);


router.get('/blocked', (req, res) => {
  res.render('user/blocked')
})


router.get('/logout',userController.logout)



module.exports=router