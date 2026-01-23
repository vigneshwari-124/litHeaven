const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/admin/adminAuthController')
const adminAuth = require('../../middlewares/adminAuth')
const noCache=require('../../middlewares/noCache')

router.get('/login',noCache,adminController.getLogin)
router.post('/login',adminController.postAdminLogin)

router.get('/dashboard',noCache,adminAuth,adminController.adminDashboard)
router.get('/customer',noCache,adminAuth,adminController.getCustomer)
router.get('/customers/:id',noCache,adminAuth, adminController.getCustomerById)

router.patch('/users/:id/block', adminController.toggleBlockUser)
router.post('/logout',adminAuth,adminController.logout)


router.get('/customer/search',noCache, adminAuth, adminController.searchCustomers);
module.exports = router
